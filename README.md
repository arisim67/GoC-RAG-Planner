# GoC / Ragnarok Planner

Welcome to the GoC/Ragnarok Planner made by ari(EA-4,43,45)/gharial(EA-44)! This web application is designed to help Tokyo Debunker guilds collaborate, strategize, and evenly distribute points during Game of Claws (GoC) and Ragnarok.

## 1. Getting Started: Server Management
When you first open the app, you will see a blank workspace. Your first step is to create a Server instance.
*   Click the **+ Add Server** button in the center of the screen (or in the top tab bar).
*   Fill out the server details: Server Name, Mode, Map, and Start/End Dates. Ensure you select the correct Mode, as this dictates the declare limits and maps.
*   You can manage multiple servers simultaneously using the Tabs Bar at the top of the screen.

## 2. Setting Up Guilds
Before mapping out the territory, you need to define who is playing. Navigate to the Guilds section:
*   **Rename or Import Guilds:** Click on "Guild 1", "Guild 2", etc., to type the actual names of the participating guilds. Alternatively, click **📥 Import**, select ‘Import Guild List (Setup)’ under Import Method, and paste a list of all participating guilds separated by a new line. 
*   **Small Guild:** If a guild is on the smaller side and has difficulty consistently being in the top 8 for kudos, this checkbox will limit their declares to 1.
*   **Base Points (Mid-Event):** If you are starting this plan mid-event, input the guilds’ current points into the `pts` box. Also fill in the `L3`, `L2`, and `L1` fields if planning mid-map. These counts are used by the optimizer to enforce fair rotation caps across the full event.
*   **Add/Remove:** Use the **+ Add Guild** button or the **✕** next to a guild to adjust the roster.
*   **Drag-and-Drop to Reorder:** Click and hold the ☰ drag handle on the left of the guild name. Drag to new position and release to reorder the guilds. Guild order is used to decide which guilds get extra points, dorm time, or castle time.

## 3. Planning the Map Strategy
The core of the app is the Planning Grid. This table lists every town, its point value, and its adjacent towns.

*   **Manual Planning:** To manually assign a town, simply click the dropdown under the corresponding Day and select the guild. Use Day 0 to establish their initial footholds. The "Adjacent Towns" column on the far left lets you quickly see which towns connect without needing an external map.
*   **Importing by Day:** You can import town placement by day using the **📥 Import** button. Paste or type the list of guilds in the exact order of the towns shown in the planning grid, select ‘Import Daily Map Data’, and select the Target Day.
*   **Full Server Export/Import:** Use the **📤 Export Server** button to download a complete backup of your current setup (including all internal guild IDs and settings) as a `.json` file. Drop this file into the Import tool to instantly restore your entire workspace.
*   **⚡ Auto-Optimize:** The app can run a massive simulation to find the best route that respects all adjacency rules, prevents map wiping, and balances final scores, Darkwick count, and Dorm count. Ragnarok and Game of Claws use different methods:
    *   **Ragnarok:** The route is found in a single pass, which can take up to about a minute.
    *   **Game of Claws:** The plan is built in two steps. First, Darkwick and the dorms are shared out as evenly as possible, and the app adds the Lv1 towns each guild needs to hold in order to reach them. Then the remaining Lv1 towns are handed out to even out total points. **This can take around 10-15 minutes** (a message appears when you click the button). Please keep the browser open until it finishes; the button shows how long it has been running. Keeping the tab visible is best, since browsers can slow down or pause background tabs, and phones may stop the work if the screen locks.
    *   **Disclaimer:** The optimization algorithm is actively under development and will not always produce a mathematically perfect distribution. It should be used as an assistive tool to generate a baseline starting point rather than a flawless final planner. For Game of Claws, Darkwick and dorm counts are the priority; in testing, a few guilds were sometimes a point or two away from an even total, so check the Stats table and adjust by hand if needed.

## 4. Validation and Rules
The app constantly watches your plan to ensure it is actually legal to execute in-game. Check the Validation section above the planning grid.
*   **Green Pills:** Your plan is valid!
*   **Red Pills:** There is a rule violation. The app highlights exactly which day and town caused the error so you can fix it.
*   **Common Violations:** 
    *   **Adjacency Errors:** A guild tried to capture a town they are not connected to. The offending cell in the Planning Grid will have a red-striped background with white text.
    *   **Declare Limits:** A guild is trying to capture too many towns in one day. The app enforces strict limits: 2 declares/day for GoC, and 3 declares/day for Ragnarok.
    *   **Map Wipes:** A guild loses all towns.

## 5. Execution and Communication
Once your plan is finalized and balanced, you need to communicate it to server leadership.
*   **🔗 Save to Cloud (Live Sync):** Click this button to upload your plan to the database and copy a shareable link to your clipboard. Anyone who opens this link will see your exact workspace. When you make changes, simply click **Save to Cloud** again, and your collaborators can just refresh their browser page to instantly pull your latest updates.
*   **📸 Screenshots:** Click this button to automatically expand the layout and take unclipped, high-resolution PNG screenshots of your Planning Grid and Stats/Declares tables. The images are bundled into a `.zip` file for quick, organized sharing on Discord.
*   **Declares & Giveaways Table:** This shows exactly how many declares (▲) and how many giveaways (↓) a guild has scheduled for a specific day.
*   **Daily Messages:** The app automatically generates formatted text blocks detailing what each guild needs to do. Simply click on a day's card to copy the instructions to your clipboard for easy pasting into Discord.

## 6. Support
*   **Automatic Saving:** All your changes are saved instantly to your browser's memory. You can refresh or close the tab, and your plan will be exactly as you left it.
*   **Support:** Have any issues or improvement suggestions? Contact `arianes.` on Discord.