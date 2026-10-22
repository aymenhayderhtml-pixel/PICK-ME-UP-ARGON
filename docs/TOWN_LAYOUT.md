# Niflheimr Town Layout Reference

Single source of truth reference for the hub town layout in *Pick Me Up: Infinite Gacha*. Exported programmatically from `src/art/town/layout.js`.

---

## 1. Wall and Island Shell Specifications

| Property | Value | Description |
| :--- | :--- | :--- |
| **Sides** | 12 | Regular dodecagonal perimeter wall |
| **Apothem** | 46.0 m | Perpendicular distance from island center (0,0) to mid-wall |
| **Outer Vertex Radius** | 47.62 m | `46.0 / cos(PI / 12)` distance to corner pillars |
| **Wall Height** | 10.0 m | Base to walkway parapet |
| **Wall Thickness** | 2.5 m | Masonry slab thickness |
| **Inner Apothem** | 44.5 m | Inner walkable clear boundary for NavGrid |
| **Corner Pillars** | 12 pillars (3.0 × 13.0 × 3.0 m) | Square stone pillars with pyramid caps (2.3 × 1.5 m) |
| **Pilasters** | 6.0 m intervals | Vertical buttresses (2.85 × 10.5 × 0.7 m) |
| **Cliff Ring** | R = 45.5 m to 53.5 m | Rocky mossy perimeter lip |
| **Island Underside** | R = 54.0 m down to y = -60.0 m | Inverted floating-island cone |

---

## 2. Terrain and Building Pads

> **Note**: Ground is flat at y = 0.0 (`HUB_TERRAIN_AMPLITUDE = 0` in `src/art/town/ground.js`). Deliberate steps exist only at building entrances and terrace thresholds.

| Pad ID | Center X | Center Z | Radius | Height (y) | Purpose |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `pad_summoning` | 30.0 | 4.0 | 12.0 m | +1.8 m | Elevated Summoning Room terrace |
| `pad_synthesis` | 0.0 | -32.0 | 10.0 m | +1.2 m | Elevated Synthesis Chamber terrace |
| `pad_landing` | 20.0 | 26.0 | 14.0 m | 0.0 m | Flat Landing Area plaza |
| `pad_town_square` | 14.0 | -8.0 | 12.0 m | 0.0 m | Flat Town Square central hub |
| `pad_rift` | 31.0 | -31.0 | 8.0 m | 0.0 m | Space-Time Rift portal gate area |
| `pad_armory` | -6.0 | -20.0 | 8.0 m | 0.0 m | Armory and forge grounds |
| `pad_residences` | -26.0 | -4.0 | 15.0 m | 0.0 m | Cottage cluster plateau |
| `pad_training` | -24.0 | 20.0 | 13.0 m | 0.0 m | Packed dirt training field |
| `pad_mess_hall` | 8.0 | 38.0 | 10.0 m | 0.0 m | Shuttered mess hall street row |
| `pad_dungeon_board` | 6.0 | -2.0 | 5.0 m | 0.0 m | Town Square bulletin clearing |

---

## 3. Major Zones and Buildings

| Zone ID | Display Name | Center (X, Z) | Footprint / Size | Rot Y | Door Position (X, Y, Z) | Outward Vector | Interaction Radius | Sign Text |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| `landing_area` | Landing Area | (20.0, 26.0) | Circle R = 8.0m (terrace R = 14m) | 0.0 | (20.0, 0.0, 16.0) | (0, 0, -1) | 8.0 m | LANDING AREA |
| `summoning_room` | Summoning Room | (30.0, 4.0) | Cylinder R = 10.0m, H = 11.0m | 0.0 | (23.5, 1.8, 11.5) | (-0.41, 0, 0.91) | 8.5 m | SUMMONING ROOM |
| `town_square` | Town Square | (14.0, -8.0) | Circle R = 11.0m (wheel emblem) | 0.0 | *Open Plaza* | *None* | 8.0 m | TOWN SQUARE |
| `space_time_rift` | Space-Time Rift | (32.53, -32.53) | Box 6.5 × 10.0 × 2.5m | 0.0 | (31.11, 0.0, -31.11) | (-0.71, 0, 0.71) | 4.5 m | SPACE-TIME RIFT |
| `synthesis_chamber`| Synthesis Chamber | (0.0, -32.0) | Cylinder R = 8.2m, H = 9.0m | 0.0 | (0.0, 0.0, -23.8) | (0, 0, 1) | 7.5 m | SYNTHESIS CHAMBER |
| `armory` | Armory | (-6.0, -20.0) | Box 10.5 × 4.5 × 5.0m (with forge) | 0.0 | (-6.0, 0.0, -17.4) | (0, 0, 1) | 4.5 m | ARMORY |
| `training_grounds` | Training Grounds | (-24.0, 20.0) | Box 16.0 × 2.5 × 16.0m | 0.0 | (-18.0, 0.0, 18.0) | (1, 0, 0) | 8.5 m | TRAINING GROUNDS |
| `residences` | Residences | (-26.0, -4.0) | Circle R = 15.0m cluster | 0.0 | (-18.0, 0.0, -4.0) | (1, 0, 0) | 12.0 m | RESIDENCES |
| `mess_hall_row` | Mess Hall | (8.0, 38.0) | Box 22.8 × 4.4 × 4.4m (6 units) | 0.0 | (8.0, 0.0, 35.8) | (0, 0, -1) | 9.0 m | MESS HALL (LOCKED) |
| `dungeon_board` | Dungeon Board | (6.0, -2.0) | Box 2.3 × 3.0 × 0.8m | 0.0 | *Open Stand* | *None* | 2.8 m | DUNGEON BOARD |

---

## 4. Residences Cottage Registry

Every cottage is half-timbered with white plaster walls, dark timber corner posts, slate gable roof, chimney, small paned window with warm 0xffc27a glow, and garden hedge.

| Cottage ID | Row | Center X | Center Z | Rot Y | Footprint (W × D × H) | Door Position (X, Y, Z) | Outward Vector |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `cottage_1` | 1 (Outer) | -33.0 | -14.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-33.8, 0.0, -12.19) | (0, 0, 1) |
| `cottage_2` | 1 (Outer) | -31.0 | -8.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-31.8, 0.0, -6.19) | (0, 0, 1) |
| `cottage_3` | 1 (Outer) | -29.0 | -2.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-29.8, 0.0, -0.19) | (0, 0, 1) |
| `cottage_4` | 1 (Outer) | -27.0 | 4.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-27.8, 0.0, 5.81) | (0, 0, 1) |
| `cottage_5` | 1 (Outer) | -25.0 | 10.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-25.8, 0.0, 11.81) | (0, 0, 1) |
| `cottage_6` | 2 (Inner) | -23.0 | -16.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-23.8, 0.0, -14.19) | (0, 0, 1) |
| `cottage_7` | 2 (Inner) | -21.0 | -10.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-21.8, 0.0, -8.19) | (0, 0, 1) |
| `cottage_8` | 2 (Inner) | -19.0 | -4.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-19.8, 0.0, -2.19) | (0, 0, 1) |
| `cottage_9` | 2 (Inner) | -17.0 | 2.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-17.8, 0.0, 3.81) | (0, 0, 1) |
| `cottage_10`| 2 (Inner) | -15.0 | 8.0 | 0.0 | 4.2 × 3.6 × 5.0 m | (-15.8, 0.0, 9.81) | (0, 0, 1) |

---

## 5. Training Facility Dummy Stands

| Dummy Slot | Stand Position (X, Y, Z) | Target Dummy Position (X, Y, Z) | Facing Direction |
| :--- | :---: | :---: | :---: |
| `dummy_1` | (-26.4, 0.0, 16.8) | (-26.4, 0.0, 18.0) | +Z (toward dummy) |
| `dummy_2` | (-24.0, 0.0, 16.8) | (-24.0, 0.0, 18.0) | +Z (toward dummy) |
| `dummy_3` | (-21.6, 0.0, 16.8) | (-21.6, 0.0, 18.0) | +Z (toward dummy) |

---

## 6. Paved Road Network

| Road Segment ID | From (X, Z) | To (X, Z) | Width (m) | Destination / Function |
| :--- | :---: | :---: | :---: | :--- |
| `road_square_landing` | (14.0, -8.0) | (20.0, 26.0) | 4.8 m | Town Square to Landing Area |
| `road_square_summoning` | (14.0, -8.0) | (26.0, 4.0) | 4.5 m | Town Square to Summoning Room Stair |
| `road_square_rift` | (14.0, -8.0) | (29.5, -29.5) | 5.0 m | Town Square to Space-Time Rift Gate |
| `road_square_synthesis` | (14.0, -8.0) | (0.0, -32.0) | 4.5 m | Town Square to Synthesis Chamber |
| `road_square_armory` | (14.0, -8.0) | (-6.0, -20.0) | 4.2 m | Town Square to Armory & Forge |
| `road_square_residences`| (14.0, -8.0) | (-26.0, -4.0) | 5.0 m | Town Square to Residences Entrance |
| `road_square_training` | (14.0, -8.0) | (-24.0, 20.0) | 4.5 m | Town Square to Training Grounds |
| `road_residences_inner` | (-32.0, -14.0)| (-20.0, 10.0) | 4.0 m | Diagonal avenue between cottage rows |
| `road_landing_mess` | (20.0, 26.0) | (8.0, 38.0) | 4.0 m | Landing Area to Mess Hall row |

---

## 7. Door Waypoint Corridors (NavGrid Pathfinding)

Every building entryway defines 3 waypoints: `[Inside Point, Door Point, Outside Point]` to guarantee heroes and NPCs navigate through doors without clipping walls or corners.

| Facility / Building ID | Inside Waypoint (X, Z) | Door Threshold Waypoint (X, Z) | Outside Street Waypoint (X, Z) |
| :--- | :---: | :---: | :---: |
| `landing_area` | (20.0, 26.0) | (20.0, 16.0) | (20.0, 13.0) |
| `summoning_room` | (30.0, 4.0) | (23.5, 11.5) | (19.5, 20.0) |
| `space_time_rift` | (32.53, -32.53) | (31.11, -31.11) | (28.5, -28.5) |
| `synthesis_chamber`| (0.0, -32.0) | (0.0, -23.8) | (0.0, -20.0) |
| `armory` | (-6.0, -20.0) | (-6.0, -17.4) | (-6.0, -14.0) |
| `training_grounds` | (-24.0, 20.0) | (-18.0, 18.0) | (-15.0, 18.0) |
| `residences_cluster`| (-26.0, -4.0) | (-18.0, -4.0) | (-14.0, -4.0) |
| `mess_hall_row` | (8.0, 38.0) | (8.0, 35.8) | (8.0, 33.0) |
| `cottage_1` | (-33.0, -14.0) | (-33.8, -12.19) | (-33.8, -10.8) |
| `cottage_2` | (-31.0, -8.0) | (-31.8, -6.19) | (-31.8, -4.8) |
| `cottage_3` | (-29.0, -2.0) | (-29.8, -0.19) | (-29.8, 1.2) |
| `cottage_4` | (-27.0, 4.0) | (-27.8, 5.81) | (-27.8, 7.2) |
| `cottage_5` | (-25.0, 10.0) | (-25.8, 11.81) | (-25.8, 13.2) |
| `cottage_6` | (-23.0, -16.0) | (-23.8, -14.19) | (-23.8, -12.8) |
| `cottage_7` | (-21.0, -10.0) | (-21.8, -8.19) | (-21.8, -6.8) |
| `cottage_8` | (-19.0, -4.0) | (-19.8, -2.19) | (-19.8, -0.8) |
| `cottage_9` | (-17.0, 2.0) | (-17.8, 3.81) | (-17.8, 5.2) |
| `cottage_10`| (-15.0, 8.0) | (-15.8, 9.81) | (-15.8, 11.2) |

---

## 8. Street Lighting and Props

| Lamp ID | Position (X, Z) | Light Color | Desired Intensity | Range |
| :--- | :---: | :---: | :---: | :---: |
| `lamp_1` | (14.0, -8.0) | Warm Gold `0xffaa44` | 7.0 | 14.0 m |
| `lamp_2` | (20.0, 22.0) | Warm Gold `0xffaa44` | 7.0 | 14.0 m |
| `lamp_3` | (-16.0, -4.0) | Warm Gold `0xffaa44` | 7.0 | 14.0 m |
| `lamp_4` | (-18.0, 18.0) | Warm Gold `0xffaa44` | 7.0 | 14.0 m |

---

## 9. Minimap Color Palette

| Zone / Feature | Fill Color | Border Color | Manhwa Reference |
| :--- | :--- | :--- | :--- |
| **Residences** | `rgba(140, 30, 35, 0.55)` | `#aa2a30` | Crimson / Dark Red |
| **Town Square** | `rgba(225, 155, 30, 0.55)` | `#e5a525` | Amber / Gold |
| **Synthesis Chamber**| `rgba(38, 155, 75, 0.55)` | `#35b558` | Emerald Green |
| **Training Grounds** | `rgba(125, 50, 165, 0.55)` | `#8c42b5` | Purple / Violet |
| **Landing Area** | `rgba(195, 40, 45, 0.55)` | `#d5353c` | Bright Red |
| **Summoning Room** | `rgba(35, 115, 215, 0.55)` | `#3085e5` | Cerulean Blue |
| **Space-Time Rift** | Marker fill `#33b4ff` | `#2288ff` | Cyan Portal |
| **Armory Forge** | Marker fill `#ff8822` | `#ff5500` | Forge Orange |
| **Paved Roads** | `rgba(184, 196, 200, 0.25)` | N/A | Pale Blue-Gray |
| **Island Background**| `rgba(15, 42, 51, 0.85)` | `#7d8f94` | Cold Teal Night |
