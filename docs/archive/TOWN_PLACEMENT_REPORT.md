# Town Placement Report (Task A05e)

Inspection of town landmark coordinates between `docs/TOWN_LAYOUT.md` / `src/art/town/layout.js`, built module door/sign anchors, `HubScene` interaction trigger positions, and HUD minimap markers.

| Landmark ID | Layout Position (Center / Door) | Visible Model / Door Anchor | Interaction Trigger (Center, Radius) | Minimap Marker Pos | Sign Anchor Pos | Agree (Door-to-Trigger Distance) |
|---|---|---|---|---|---|---|
| `space_time_rift` | Center (27.0, -27.0), Door (27.0, -25.5) | Door (27.00, 0.00, -25.50) | (27.0, -25.5), r=4.0m | (27.0, -25.5) | (27.00, 12.00, -27.00) | **0.00m (Agree)** |
| `dungeon_board` | Center (6.0, -2.0), Door: None | Board (6.00, 3.40, -2.00) | (6.0, -2.0), r=3.5m | (6.0, -2.0) | (6.00, 3.40, -2.00) | **0.00m (Agree)** |
| `summoning_room` | Center (30.0, 4.0), Door (23.5, 11.5) | Door (23.50, 3.40, 11.50) | (23.5, 11.5), r=4.0m | (23.5, 11.5) | (30.00, 14.80, 4.00) | **0.00m (Agree)** |
| `synthesis_chamber` | Center (0.0, -32.0), Door (0.0, -23.8) | Door (0.00, 1.20, -23.80) | (0.0, -23.8), r=4.0m | (0.0, -23.8) | (0.00, 16.20, -32.00) | **0.00m (Agree)** |
| `armory` | Center (-6.0, -20.0), Door (-6.0, -17.4) | Door (-6.00, 0.00, -17.40) | (-6.0, -17.4), r=4.0m | (-6.0, -17.4) | (-6.00, 5.60, -20.00) | **0.00m (Agree)** |
| `training_grounds` | Center (-24.0, 20.0), Door (-18.0, 18.0) | Door (-18.00, 0.00, 18.00) | (-18.0, 18.0), r=4.0m | (-18.0, 18.0) | (-24.00, 4.00, 20.00) | **0.00m (Agree)** |
| `residences` | Center (-26.0, -4.0), Main Door (-18.0, -4.0) | Cottages 1-10 doors, Dorm (-18.00, 3.69, -4.00) | Cottage doors & Dorm (-18.0, -4.0), r=3.5m | (-18.0, -4.0) | (-18.00, 3.69, -4.00) | **0.00m (Agree)** |
| `mess_hall_row` | Center (8.0, 38.0), Door (8.0, 35.8) | Door (8.00, 0.00, 35.80) | (8.0, 35.8), r=4.0m | (8.0, 35.8) | (8.00, 5.20, 38.00) | **0.00m (Agree)** |
| `landing_area` | Center (20.0, 26.0), Door (20.0, 16.0) | Door (20.00, 0.00, 16.00) | (20.0, 16.0), r=4.0m | (20.0, 16.0) | (20.00, 6.00, 26.00) | **0.00m (Agree)** |
| `town_square` | Center (14.0, -8.0), Door: None | Plaza (14.00, 4.00, -8.00) | (14.0, -8.0), r=5.0m | (14.0, -8.0) | (14.00, 4.00, -8.00) | **0.00m (Agree)** |

positions agree
