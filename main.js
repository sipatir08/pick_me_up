import Map from 'https://cdn.skypack.dev/ol/Map.js';
import View from 'https://cdn.skypack.dev/ol/View.js';
import TileLayer from 'https://cdn.skypack.dev/ol/layer/Tile.js';
import OSM from 'https://cdn.skypack.dev/ol/source/OSM.js';
import Overlay from 'https://cdn.skypack.dev/ol/Overlay.js';
import { toLonLat, fromLonLat } from 'https://cdn.skypack.dev/ol/proj.js';
import Feature from 'https://cdn.skypack.dev/ol/Feature.js';
import Point from 'https://cdn.skypack.dev/ol/geom/Point.js';
import VectorSource from 'https://cdn.skypack.dev/ol/source/Vector.js';
import VectorLayer from 'https://cdn.skypack.dev/ol/layer/Vector.js';
import { Style, Icon } from 'https://cdn.skypack.dev/ol/style.js';
import Swal from 'https://cdn.skypack.dev/sweetalert2';

// Inisialisasi peta
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([0, 0]),
    zoom: 2,
  }),
});

// Pop-up untuk informasi lokasi
const popup = document.createElement('div');
popup.className = 'popup';
document.body.appendChild(popup);

const overlay = new Overlay({
  element: popup,
  autoPan: true,
});
map.addOverlay(overlay);

// Sumber data marker
const markerSource = new VectorSource();
const markerLayer = new VectorLayer({
  source: markerSource,
});
map.addLayer(markerLayer);

// Fungsi menambahkan marker
function addMarker(lon, lat, isUser = false) {
  const marker = new Feature({
    geometry: new Point(fromLonLat([lon, lat])),
  });

  marker.setStyle(
    new Style({
      image: new Icon({
        src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        scale: 0.05,
      }),
    })
  );

  if (isUser) {
    marker.set("isUserLocation", true);
  } else {
    marker.set("isClickedLocation", true);
  }

  markerSource.addFeature(marker);
  return marker;
}

// Fungsi mengambil lokasi pengguna
function getLocation() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const userCoordinates = fromLonLat([longitude, latitude]);

      map.getView().setCenter(userCoordinates);
      map.getView().setZoom(16);

      // Hapus marker lokasi sebelumnya
      markerSource.getFeatures().forEach((feature) => {
        if (feature.get("isUserLocation")) {
          markerSource.removeFeature(feature);
        }
      });

      addMarker(longitude, latitude, true); // Tambahkan marker lokasi pengguna

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lon=${longitude}&lat=${latitude}`)
        .then((response) => response.json())
        .then((data) => {
          const locationName = data.display_name || 'Tidak ada data lokasi';
          popup.innerHTML = `
            <div class="location-popup">
              <h3><i class="fas "></i> Lokasi Anda</h3>
              <div class="location-details">
                <p><strong>Alamat:</strong> ${locationName}</p>
                <p><strong>Koordinat:</strong> ${longitude.toFixed(6)}, ${latitude.toFixed(6)}</p>
              </div>
            </div>`;
          overlay.setPosition(userCoordinates);
        })
        .catch(() => {
          popup.innerHTML = `
            <div class="location-popup">
              <h3><i class="fas fa-exclamation-circle"></i> Lokasi Anda</h3>
              <div class="location-details">
                <p>Data lokasi tidak ditemukan.</p>
                <p><strong>Koordinat:</strong> ${longitude.toFixed(6)}, ${latitude.toFixed(6)}</p>
              </div>
            </div>`;
          overlay.setPosition(userCoordinates);
        });
    },
    (err) => {
      console.error("Error mendapatkan lokasi:", err);
      alert("Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan.");
    }
  );
}

// Event klik pada peta
map.on("click", async function (event) {
  const clickedCoordinates = toLonLat(event.coordinate);
  const [longitude, latitude] = clickedCoordinates;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lon=${longitude}&lat=${latitude}`
    );
    const data = await response.json();
    const locationName = data.display_name || "Alamat tidak ditemukan";

    // Hapus semua marker hasil klik sebelumnya
    markerSource.getFeatures().forEach((feature) => {
      if (feature.get("isClickedLocation")) {
        markerSource.removeFeature(feature);
      }
    });

    addMarker(longitude, latitude, false); // Tambahkan marker baru hasil klik

    popup.innerHTML = `
      <div class="location-popup">
        <h3><i class="fas "></i> Informasi Lokasi</h3>
        <div class="location-details">
          <p><strong>Alamat:</strong> ${locationName}</p>
          <p><strong>Koordinat:</strong> ${longitude.toFixed(6)}, ${latitude.toFixed(6)}</p>
        </div>
      </div>`;
    overlay.setPosition(event.coordinate);
  } catch (error) {
    console.error("Gagal mengambil alamat:", error);
  }
});

// Event untuk memperbarui lokasi
document.getElementById('refreshLocation').addEventListener('click', () => {
  Swal.fire({
    title: 'Memuat Ulang...',
    text: 'Mohon tunggu sebentar.',
    icon: 'info',
    timer: 1500,
    showConfirmButton: false,
  }).then(() => {
    location.reload(); // Me-refresh halaman sepenuhnya
  });
});


// Event untuk berbagi lokasi
document.getElementById('shareLocation').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    const shareUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        Swal.fire({
          title: 'Berhasil!',
          text: 'Link lokasi telah disalin ke clipboard.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      });
    } else {
      Swal.fire({
        title: 'Salin Link Lokasi',
        text: shareUrl,
        icon: 'info',
        confirmButtonText: 'OK'
      });
    }
  }, () => {
    Swal.fire({
      title: 'Gagal!',
      text: 'Tidak dapat mengambil lokasi.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  });
});

// Panggil fungsi untuk mendapatkan lokasi awal
getLocation();
