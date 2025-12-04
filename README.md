Mini Project 2 – Course Explorer

This project is a simple course explorer page. It loads course data from a JSON file and lets you filter, sort, and click on courses to see more details. Everything is done with basic HTML, CSS, and JavaScript.

What it can do

Load the default courses.json file

Load your own JSON file if you want

Filter by department, level, credits

Search by keywords (title, description, instructor)

Sort the list (A→Z, Z→A, course ID, semester)

Click a course to see full details on the right

Shows error messages if the JSON is invalid or missing

How to run it

Because the page uses fetch(), you need to open it with a local server.

Easiest way:

Open the folder in VS Code

Install the “Live Server” extension

Right-click index.html → Open with Live Server

Click Load default courses.json to load the data

Files
index.html   – main page
styles.css   – styling
script.js    – all the JavaScript
courses.json – sample course data
page_*.png   – images from the assignment (not required to run)

Notes

Uses .filter() for filtering

Uses .sort() for sorting

Uses a simple Course class to organize the data

Everything needed for the project is included in the folder.
