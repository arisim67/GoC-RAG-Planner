# GoC / Ragnarok Planner

Welcome to the GoC/Ragnarok Planner made by ari(EA-4,43,45)/gharial(EA-44)! This web application is designed to help Tokyo Debunker guilds collaborate, strategize, and evenly distribute points during Game of Claws (GoC) and Ragnarok.

**New here?** The first time you open the app, a short interactive tutorial walks you through it. You can skip it, and replay it any time with the **🎓 Tutorial** button at the top of the page.

## 1. Getting Started: Server Management
When you first open the app, you will see a blank workspace. Your first step is to create a Server instance.
*   Click the **+ Add Server** button in the center of the screen (or in the top tab bar).
*   Fill out the server details: Server Name, Mode, Map, and Start/End Dates. Ensure you select the correct Mode, as this dictates the declare limits and maps.
*   You can manage multiple servers simultaneously using the Tabs Bar at the top of the screen.
*   **🗑 Delete Server:** Removes that server and its plan from this browser. It asks you to confirm first, and it cannot be undone, so take a backup with **📤 Export Server** first if there is any chance you will want it back.

## 2. Setting Up Guilds
Before mapping out the territory, you need to define who is playing. Navigate to the Guilds section:
*   **Rename or Import Guilds:** Click on "Guild 1", "Guild 2", etc., to type the actual names of the participating guilds. Alternatively, click **📥 Import**, select ‘Import Guild List (Setup)’ under Import Method, and paste a list of all participating guilds separated by a new line. 
*   **Small Guild:** If a guild is on the smaller side and has difficulty consistently being in the top 8 for kudos, this checkbox will limit their declares to 1.
*   **Base Points (Mid-Event):** If you are starting this plan mid-event, input the guilds’ current points into the `pts` box. Also fill in the `L3`, `L2`, and `L1` fields if planning mid-map. These counts are used by the optimizer to enforce fair rotation caps across the full event.
*   **Exclude Guild (Ragnarok only):** Keeps that guild's Day 0 towns on the map but leaves it out of declares and point balancing, so the rest of the plan is built around it without anything being assigned to it.
*   **Add/Remove:** Use the **+ Add Guild** button or the **✕** next to a guild to adjust the roster. A server holds up to **15 guilds**, and each one is given a colour that is not already in use.
*   **Drag-and-Drop to Reorder:** Click and hold the ☰ drag handle on the left of the guild name. Drag to new position and release to reorder the guilds. Guild order is used to decide which guilds get extra points, dorm time, or castle time.

## 3. Planning the Map Strategy
The core of the app is the Planning Grid. This table lists every town, its point value, and its adjacent towns.

*   **Manual Planning:** To manually assign a town, click the dropdown under the corresponding Day and select the guild. Use Day 0 to establish their initial footholds. The "Adjacent Towns" column on the far left lets you quickly see which towns connect without needing an external map.
*   **Copying across the grid (spreadsheet-style):** Select cells in any of three ways — long-press a single cell, press and drag across a block, or click one cell and shift-click another to extend the selection. A quick click without holding opens that cell's dropdown instead, so selecting never gets in the way of normal editing. The selected block is outlined and tinted, with a small handle on its bottom-right corner: drag that handle sideways to repeat the block across days, or downwards to repeat it down towns. The block repeats rather than stretches, so dragging a two-day pattern across six days lays it down three times.
*   **Importing by Day:** You can import town placement by day using the **📥 Import** button. Paste or type the list of guilds in the exact order of the towns shown in the planning grid, select ‘Import Daily Map Data’, and select the Target Day.
*   **Full Server Export/Import:** Use the **📤 Export Server** button to download a complete backup of your current setup (including all internal guild IDs and settings) as a `.json` file. Drop this file into the Import tool to instantly restore your entire workspace.
*   **⚡ Auto-Optimize:** The app can run a massive simulation to find the best route that respects all adjacency rules, prevents map wiping, and balances final scores, Darkwick count, and Dorm count. Ragnarok and Game of Claws use different methods:
    *   **Ragnarok:** The route is found in a single pass, which can take up to about a minute.
    *   **Game of Claws:** The plan is built in two steps. First, Darkwick and the dorms are shared out as evenly as possible, and the app adds the Lv1 towns each guild needs to hold in order to reach them. Then the remaining Lv1 towns are handed out to even out total points. **How long this takes depends mostly on how many guilds there are: around 1-3 minutes for 10 guilds, and up to about 10 minutes for 13** (a message appears when you click the button). Filling in a day or two yourself before you optimize also makes a real difference, because those are days the solver no longer has to work out: on a 10-guild map, planning day 2 by hand as well as day 1 cut a run from about three and a half minutes to one. Please keep the browser open until it finishes; the button shows how long it has been running. Keeping the tab visible is best, since browsers can slow down or pause background tabs, and phones may stop the work if the screen locks.
    *   **↩ Undo Optimize:** Appears next to the button after a run and puts the plan back exactly as it was beforehand, so trying an optimize never costs you the version you had. Only the most recent run can be undone.
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
*   **🔗 Save to Cloud (Live Sync):** Click this button to upload your plan to the database and copy a shareable link to your clipboard. Anyone who opens this link sees your exact workspace, as a view-only copy. When you make changes, click **Save to Cloud** again; the people you shared it with then click **🔄 Pull Latest Updates** (or refresh the page) to get your new version.
*   **🔄 Sync from Cloud:** Pulls the saved cloud version of the current server back down to this browser — useful when you have been editing the same plan from another device. Note that it **replaces** this browser's copy of that server, so anything you have changed here since the last Save to Cloud is lost. Save first if you are unsure which side is newer.
*   **👀 View-Only Mode (what the people you share with see):** Opening a shared link gives a locked copy that cannot be edited, with four buttons: **📋 Duplicate to Edit** makes an editable copy in a new tab called "… (My Copy)", **🔄 Pull Latest Updates** fetches your newest saved version, **📸 Screenshots** saves the images, and **📤 Export Data** downloads the plan as a `.json` backup. A duplicate is a separate plan from then on and does not receive your later updates.
*   **📸 Screenshots:** Click this button to automatically expand the layout and take unclipped, high-resolution PNG screenshots of your Planning Grid and Stats/Declares tables. The images are bundled into a `.zip` file for quick, organized sharing on Discord. On phones and tablets a **📤 Share to Apps** button also appears, which hands the images straight to Discord or any other app in the share sheet.
*   **Stats Tables:** **Final Scores** shows each guild's points next to the even target, so you can see at a glance who is over or under. **Total Occupation** counts how many days each guild held Darkwick, a dorm and each Lv1 town, which is what you check when points are even but castle or dorm time is not.
*   **Declares & Giveaways Table:** This shows exactly how many declares (▲) and how many giveaways (↓) a guild has scheduled for a specific day.
*   **Daily Messages:** The app automatically generates formatted text blocks detailing what each guild needs to do. Simply click on a day's card to copy the instructions to your clipboard for easy pasting into Discord.
    *   **✏️ Template:** Change how the messages are written. Write the top of each day's message and the part repeated for each guild, using placeholders that the planner fills in: `{label}` (D5 Sun 11/08), `{day}`, `{weekday}`, `{date}`, `{mm}`, `{dd}`, `{server}` for the day, and `{guild}`, `{declares}`, `{giveaways}`, `{def}` (with the backup advice) or `{def-town}` (town only) for each guild. You can also choose what to show when there's nothing, such as `--`. A preview updates as you type. The template is saved in your browser and used for every server; **Reset to default** brings back the original format.
    *   **Guild names in messages:** In the same window, give any guild a decorated name (emoji and all) to use in messages only. Tables keep the plain name. These are saved with the server, so they come along with Export and Save to Cloud.

## 6. Support
*   **Automatic Saving:** All your changes are saved instantly to your browser's memory. You can refresh or close the tab, and your plan will be exactly as you left it.
*   **Support:** Have any issues or improvement suggestions? Contact `arianes.` on Discord.