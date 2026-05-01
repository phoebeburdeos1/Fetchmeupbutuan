"use client"

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix for default marker icons in React-Leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

const emeraldIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapResizer({ route, singlePoint }: { route?: [number, number][], singlePoint?: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 1) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (singlePoint) {
      map.setView(singlePoint, 15);
    }
  }, [route, singlePoint, map]);

  return null;
}

const tricycleIcon = L.icon({
  iconUrl: "https://img.icons8.com/color/96/auto-rickshaw.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

export default function Map({ 
  center = [8.9475, 125.5406],
  height = '100%',
  route = [],
  pickupPoint,
  destinationPoint,
  driverLocation
}: { 
  center?: [number, number],
  height?: string,
  route?: [number, number][],
  pickupPoint?: [number, number],
  destinationPoint?: [number, number],
  driverLocation?: [number, number]
}) {
  return (
    <div style={{ height }} className="w-full z-0 relative">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {driverLocation && (
          <Marker position={driverLocation} icon={tricycleIcon}>
            <Popup className="font-bold text-emerald-600">Your Driver is here!</Popup>
          </Marker>
        )}

        {/* Only show single point if route isn't active yet */}
        {!route || route.length <= 1 ? (
          <>
            {pickupPoint && (
              <Marker position={pickupPoint} icon={icon}>
                <Popup className="font-bold">Pickup</Popup>
              </Marker>
            )}
            {destinationPoint && (
              <Marker position={destinationPoint} icon={emeraldIcon}>
                <Popup className="font-bold">Destination</Popup>
              </Marker>
            )}
            <MapResizer singlePoint={driverLocation || pickupPoint || destinationPoint} />
          </>
        ) : (
          <>
            <Polyline 
              positions={route} 
              pathOptions={{ 
                color: '#10B981', 
                weight: 6, 
                opacity: 0.7,
                lineJoin: 'round'
              }} 
            />
            <Marker position={route[0]} icon={icon}>
              <Popup className="font-bold text-emerald-600">Pickup</Popup>
            </Marker>
            <Marker position={route[route.length - 1]} icon={emeraldIcon}>
              <Popup className="font-bold">
                <p className="text-slate-900 font-black">DESTINATION</p>
                <p className="text-emerald-600 text-xs font-bold mt-1">Arrival: ~15 mins</p>
              </Popup>
            </Marker>
            <MapResizer route={route} />
          </>
        )}
      </MapContainer>
    </div>
  )
}
