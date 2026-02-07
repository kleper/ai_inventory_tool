import os
import requests
from dotenv import load_dotenv

load_dotenv()

MAPBOX_ACCESS_TOKEN = os.getenv("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN")

class MapboxService:
    @staticmethod
    def generate_static_map(lat: float, lng: float, item_id: int) -> str:
        """
        Generates a static map image from Mapbox, saves it to /app/media/maps,
        and returns the relative URL.
        """
        if not MAPBOX_ACCESS_TOKEN:
            print("Error: No Mapbox Token found in env")
            return None

        # Ensure directory exists
        maps_dir = "/app/media/maps"
        if not os.path.exists(maps_dir):
            os.makedirs(maps_dir)

        # File path
        filename = f"map_{item_id}.png"
        filepath = os.path.join(maps_dir, filename)
        
        # Mapbox URL - Using the specific parameters requested by user
        # Style: dark-v11
        # Marker: pin-s+000000 (Black pin)
        # Zoom: 15 (Balanced) - User example had 9 and 17.5. 15 is standard for items.
        # Dimensions: 600x300
        # Attribution/Logo: true (for compliance and reliability)
        
        url = (
            f"https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/"
            f"pin-s+000000({lng},{lat})/{lng},{lat},15,0/600x300"
            f"?access_token={MAPBOX_ACCESS_TOKEN}&attribution=true&logo=true"
        )
        
        try:
            response = requests.get(url, stream=True)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                
                # Return relative path for frontend
                # Using /media mount
                return f"/media/maps/{filename}"
            else:
                print(f"Mapbox API Error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Error generating map: {e}")
            return None
