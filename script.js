// ====== Global state ======
let allCourses = [];     // Array<Course>
let currentCourses = []; // After filters & sort
let selectedCourse = null;

// Cached DOM elements
const fileInput = document.getElementById("fileInput");
const loadDefaultBtn = document.getElementById("loadDefaultBtn");
const statusMessage = document.getElementById("statusMessage");

const departmentFilter = document.getElementById("departmentFilter");
const levelFilter = document.getElementById("levelFilter");
const creditsFilter = document.getElementById("creditsFilter");
const searchInput = document.getElementById("searchInput");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

const sortSelect = document.getElementById("sortSelect");

const courseListElement = document.getElementById("courseList");
const courseDetailsElement = document.getElementById("courseDetails");
const resultsCountElement = document.getElementById("resultsCount");

// ====== Course class definition ======
class Course {
    constructor(raw) {
        this.id = raw.id;
        this.title = raw.title;
        this.department = raw.department;
        this.level = raw.level;
        this.credits = raw.credits;
        this.instructor = raw.instructor;
        this.description = raw.description;
        this.semester = raw.semester; // e.g. "Fall 2025"
    }

    /**
     * Returns a string used for text search (title + description + instructor).
     */
    get searchableText() {
        return (
            (this.title || "") +
            " " +
            (this.description || "") +
            " " +
            (this.instructor || "")
        ).toLowerCase();
    }

    /**
     * Convert a semester string like "Fall 2025" into a numeric key for sorting.
     * We want Summer 2025 < Fall 2025 < Winter 2026, etc.
     */
    getSemesterKey() {
        if (!this.semester) return Number.POSITIVE_INFINITY;

        const parts = this.semester.split(" ");
        if (parts.length !== 2) return Number.POSITIVE_INFINITY;

        const term = parts[0].toLowerCase();
        const year = parseInt(parts[1], 10);

        let termOrder;
        // Adjust if your professor defined a specific order.
        if (term === "winter") termOrder = 1;
        else if (term === "summer") termOrder = 2;
        else if (term === "fall") termOrder = 3;
        else termOrder = 4; // unknown term at end

        return year * 10 + termOrder;
    }
}

// ====== Utility: status & error messages ======
function setStatus(message, isError = false) {
    statusMessage.textContent = message || "";
    statusMessage.classList.remove("status-message--ok", "status-message--error");

    if (!message) return;

    statusMessage.classList.add(
        isError ? "status-message--error" : "status-message--ok"
    );
}

// ====== Data Loading ======
async function loadDefaultCourses() {
    try {
        setStatus("Loading default courses.json...");
        const response = await fetch("courses.json");
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const json = await response.json();
        handleLoadedData(json, "Default file loaded successfully.");
    } catch (err) {
        console.error(err);
        setStatus("Could not load courses.json. Make sure it is in the same folder and you are using a local server.", true);
    }
}

function loadCoursesFromFile(file) {
    if (!file) {
        setStatus("No file selected.", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;
            const json = JSON.parse(text);
            handleLoadedData(json, `Loaded data from ${file.name}.`);
        } catch (err) {
            console.error(err);
            setStatus("Error parsing JSON file. Please check the format.", true);
        }
    };
    reader.onerror = () => {
        setStatus("Error reading file.", true);
    };
    reader.readAsText(file);
}

function handleLoadedData(json, successMessage) {
    if (!Array.isArray(json)) {
        setStatus("JSON root is not an array. Expected an array of course objects.", true);
        return;
    }

    // Validate objects (basic check)
    const missingKeys = ["id", "title", "department", "level", "credits", "instructor", "description", "semester"];
    const invalid = json.some(obj =>
        missingKeys.some(key => !(key in obj))
    );
    if (invalid) {
        setStatus("JSON does not contain the expected course fields.", true);
        return;
    }

    // Convert to Course instances
    allCourses = json.map(obj => new Course(obj));
    setStatus(successMessage, false);

    // Initialize filters based on data
    initFilterOptions(allCourses);

    // Apply filters + sort and render list
    applyFiltersAndRender();
}

// ====== Filters & sort ======
function initFilterOptions(courses) {
    // Department options (deduplicated)
    const departments = [...new Set(courses.map(c => c.department))].sort();
    departmentFilter.innerHTML = '<option value="">All departments</option>';
    departments.forEach(dept => {
        const opt = document.createElement("option");
        opt.value = dept;
        opt.textContent = dept;
        departmentFilter.appendChild(opt);
    });

    // Credits options
    const creditsSet = [...new Set(courses.map(c => c.credits))].sort((a, b) => a - b);
    creditsFilter.innerHTML = '<option value="">All credits</option>';
    creditsSet.forEach(cr => {
        const opt = document.createElement("option");
        opt.value = String(cr);
        opt.textContent = `${cr} credit(s)`;
        creditsFilter.appendChild(opt);
    });

    // Reset text search + level filter
    searchInput.value = "";
    levelFilter.value = "";
}

function applyFiltersAndRender() {
    if (allCourses.length === 0) {
        courseListElement.innerHTML = "";
        resultsCountElement.textContent = "No data loaded";
        courseDetailsElement.innerHTML = "<p>No data loaded yet.</p>";
        return;
    }

    const deptVal = departmentFilter.value;
    const levelVal = levelFilter.value;
    const creditsVal = creditsFilter.value;
    const searchVal = searchInput.value.trim().toLowerCase();

    // Filter using Array.filter (required in rubric)
    let filtered = allCourses.filter(course => {
        // Department
        if (deptVal && course.department !== deptVal) return false;
        // Level (e.g. 100, 200)
        if (levelVal && String(course.level) !== levelVal) return false;
        // Credits
        if (creditsVal && String(course.credits) !== creditsVal) return false;
        // Text search
        if (searchVal && !course.searchableText.includes(searchVal)) return false;

        return true;
    });

    // Sort using Array.sort
    const sortMode = sortSelect.value;
    filtered.sort((a, b) => {
        if (sortMode === "title-asc") {
            return a.title.localeCompare(b.title);
        } else if (sortMode === "title-desc") {
            return b.title.localeCompare(a.title);
        } else if (sortMode === "id") {
            return a.id.localeCompare(b.id);
        } else if (sortMode === "semester") {
            return a.getSemesterKey() - b.getSemesterKey();
        }
        return 0;
    });

    currentCourses = filtered;
    renderCourseList();
}

// ====== Rendering ======
function renderCourseList() {
    courseListElement.innerHTML = "";

    if (currentCourses.length === 0) {
        resultsCountElement.textContent = "0 courses (no matches for current filters)";
        const li = document.createElement("li");
        li.textContent = "No courses match the selected filters.";
        li.className = "course-item";
        courseListElement.appendChild(li);
        courseDetailsElement.innerHTML = "<p>No course selected.</p>";
        return;
    }

    resultsCountElement.textContent = `${currentCourses.length} course(s)`;

    currentCourses.forEach(course => {
        const li = document.createElement("li");
        li.className = "course-item";

        const titleEl = document.createElement("div");
        titleEl.className = "course-item__title";
        titleEl.textContent = `${course.id} – ${course.title}`;

        const metaEl = document.createElement("div");
        metaEl.className = "course-item__meta";
        metaEl.textContent = `${course.department} | Level ${course.level} | ${course.credits} credit(s) | ${course.semester}`;

        li.appendChild(titleEl);
        li.appendChild(metaEl);

        li.addEventListener("click", () => {
            selectedCourse = course;
            renderCourseDetails();
        });

        courseListElement.appendChild(li);
    });

    // If we just loaded data, auto-select the first course
    if (!selectedCourse && currentCourses.length > 0) {
        selectedCourse = currentCourses[0];
        renderCourseDetails();
    } else if (selectedCourse) {
        // If there was a selected course, keep it if still in the list
        const stillThere = currentCourses.find(c => c.id === selectedCourse.id);
        if (stillThere) {
            selectedCourse = stillThere;
            renderCourseDetails();
        } else {
            courseDetailsElement.innerHTML = "<p>No course selected.</p>";
        }
    }
}

function renderCourseDetails() {
    if (!selectedCourse) {
        courseDetailsElement.innerHTML = "<p>No course selected.</p>";
        return;
    }

    const c = selectedCourse;

    courseDetailsElement.innerHTML = `
        <h3>${c.id} – ${c.title}</h3>
        <dl>
            <dt>Department</dt>
            <dd>${c.department}</dd>
            <dt>Level</dt>
            <dd>${c.level}</dd>
            <dt>Credits</dt>
            <dd>${c.credits}</dd>
            <dt>Instructor</dt>
            <dd>${c.instructor}</dd>
            <dt>Semester</dt>
            <dd>${c.semester}</dd>
        </dl>
        <p>${c.description}</p>
    `;
}

// ====== Event wiring ======
function setupEventListeners() {
    loadDefaultBtn.addEventListener("click", loadDefaultCourses);

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        loadCoursesFromFile(file);
    });

    departmentFilter.addEventListener("change", applyFiltersAndRender);
    levelFilter.addEventListener("change", applyFiltersAndRender);
    creditsFilter.addEventListener("change", applyFiltersAndRender);
    sortSelect.addEventListener("change", applyFiltersAndRender);

    searchInput.addEventListener("input", () => {
        applyFiltersAndRender();
    });

    resetFiltersBtn.addEventListener("click", () => {
        departmentFilter.value = "";
        levelFilter.value = "";
        creditsFilter.value = "";
        searchInput.value = "";
        sortSelect.value = "title-asc";
        applyFiltersAndRender();
    });
}

// ====== Init ======
setupEventListeners();
// Note: we do NOT auto-load courses.json on page load, so the
// instructor can see the "no data" state if they want.
setStatus("Please load a course JSON file to begin.");
