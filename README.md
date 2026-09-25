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

## 3. Planning the Map Strategy
The core of the app is the Planning Grid. This table lists every town, its point value, and its adjacent towns.

*   **Manual Planning:** To manually assign a town, simply click the dropdown under the corresponding Day and select the guild. Use Day 0 to establish their initial footholds. The "Adjacent Towns" column on the far left lets you quickly see which towns connect without needing an external map.
*   **Importing by Day:** You can import town placement by day using the **📥 Import** button. Paste or type the list of guilds in the exact order of the towns shown in the planning grid, select ‘Import Daily Map Data’, and select the Target Day.
*   **Full Server Export/Import:** Use the **📤 Export Server** button to download a complete backup of your current setup (including all internal guild IDs and settings) as a `.json` file. Drop this file into the Import tool to instantly restore your entire workspace.
*   **⚡ Auto-Optimize:** The app can run a massive simulation to find the best route that respects all adjacency rules, prevents map wiping, and balances final scores, Darkwick count, and Dorm count. The engine dynamically accounts for Day 1 constraints, strictly distributes leftover points and days according to your roster order, enforces consecutive Darkwick holds, and heavily penalizes unnecessary map movement. 
*   **Optimizer Settings:** This panel gives you direct control over how the optimizer balances the plan. You can set the maximum number of days any single guild can hold Darkwick or a Dorm. Each field shows the computed “fair” value (total available days ÷ number of guilds) as a reference. Lowering the cap spreads access more tightly; raising it relaxes the restriction. Changes take effect on the next run.

## 4. Validation and Rules
The app constantly watches your plan to ensure it is actually legal to execute in-game. Check the Validation section below the final scores.
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

## 6. Mid-Event Adjustments: The Repair Tool
No plan survives contact with the enemy. If someone misses a capture, a rogue guild takes a town, or the map state drifts from your plan, you must fix the timeline. Do NOT just change the dropdowns in the middle of the grid manually, as this can create cascading adjacency errors. Instead, use the Repair Tool.

1. Click the **🔧 Repair** button in the Server Settings.
2. Select the Day the deviation occurred.
3. Select the Town that was affected.
4. The modal will show you who was supposed to own it versus who actually owns it. Change the "New owner" dropdown to reflect reality.
5. Click **Apply Changes**. The app will safely splice this new reality into your timeline and adjust the following days automatically.

## 7. Support
*   **Automatic Saving:** All your changes are saved instantly to your browser's memory. You can refresh or close the tab, and your plan will be exactly as you left it.
*   **Support:** Have any issues or improvement suggestions? Contact `arianes.` on Discord.