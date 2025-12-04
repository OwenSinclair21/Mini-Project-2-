// assignmentManager.js
"use strict";

// Represents a single assignment for a student
class Assignment {
  constructor(assignmentName) {
    this.assignmentName = assignmentName;
    this.status = "released";      // default status when created
    this._grade = null;            // private-by-convention
    this._graded = false;          // track if grading already happened
    this._workTimeoutId = null;    // used by startWorking for auto-submit
  }

  // Set grade and update status based on pass/fail
  setGrade(grade) {
    this._grade = grade;
    this._graded = true;
    this.status = grade > 50 ? "Pass" : "Fail";
  }
}

// Observer for logging status updates
class Observer {
  notify(student, assignment, isReminder = false) {
    const name = student.fullName;
    const aName = assignment.assignmentName;
    const status = assignment.status;

    let msg;

    if (isReminder || status === "final reminder") {
      msg = `Observer → ${name}, final reminder for ${aName}.`;
    } else if (status === "released") {
      msg = `Observer → ${name}, ${aName} has been released.`;
    } else if (status === "working") {
      msg = `Observer → ${name} is working on ${aName}.`;
    } else if (status === "submitted") {
      msg = `Observer → ${name} has submitted ${aName}.`;
    } else if (status === "Pass") {
      msg = `Observer → ${name} has passed ${aName}`;
    } else if (status === "Fail") {
      msg = `Observer → ${name} has failed ${aName}`;
    } else {
      msg = `Observer → ${name}, ${aName} status updated to ${status}.`;
    }

    console.log(msg);
  }
}

// Represents a student and all their assignments
class Student {
  constructor(fullName, email, observer) {
    this.fullName = fullName || "";
    this.email = email || "";
    this.assignmentStatuses = []; // array of Assignment objects
    this.overallGrade = null;
    this.observer = observer;
  }

  setFullName(name) {
    this.fullName = name;
  }

  setEmail(email) {
    this.email = email;
  }

  // Helper to find an assignment by name
  _findAssignment(assignmentName) {
    return (
      this.assignmentStatuses.find(
        (a) => a.assignmentName === assignmentName
      ) || null
    );
  }

  // Notify observer on status changes
  _notifyObserver(assignment, isReminder = false) {
    if (this.observer && typeof this.observer.notify === "function") {
      this.observer.notify(this, assignment, isReminder);
    }
  }

  // Recalculate overall average grade from graded assignments
  _recalculateOverallGrade() {
    const graded = this.assignmentStatuses.filter(
      (a) => a._grade !== null && a._grade !== undefined
    );

    if (graded.length === 0) {
      this.overallGrade = null;
      return this.overallGrade;
    }

    const total = graded.reduce((sum, a) => sum + a._grade, 0);
    this.overallGrade = total / graded.length;
    return this.overallGrade;
  }

  // Create / update an assignment and optionally set a grade
  updateAssignmentStatus(assignmentName, grade) {
    let assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      assignment = new Assignment(assignmentName);
      this.assignmentStatuses.push(assignment);
      this._notifyObserver(assignment); // released
    }

    if (typeof grade === "number") {
      assignment.setGrade(grade);
      this._notifyObserver(assignment);
      this._recalculateOverallGrade();
    }
  }

  // Get status string for a specific assignment name
  getAssignmentStatus(assignmentName) {
    const assignment = this._findAssignment(assignmentName);
    if (!assignment) return "Hasn't been assigned";
    return assignment.status;
  }

  // Start working on an assignment and auto-submit after 500ms
  startWorking(assignmentName) {
    let assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      assignment = new Assignment(assignmentName);
      this.assignmentStatuses.push(assignment);
      this._notifyObserver(assignment); // released
    }

    assignment.status = "working";
    this._notifyObserver(assignment);

    // clear any previous timer
    if (assignment._workTimeoutId) {
      clearTimeout(assignment._workTimeoutId);
    }

    // auto-submit after 500ms if not already submitted/graded
    assignment._workTimeoutId = setTimeout(() => {
      if (
        assignment.status === "working" ||
        assignment.status === "released" ||
        assignment.status === "final reminder"
      ) {
        this.submitAssignment(assignmentName);
      }
    }, 500);
  }

  // Submit an assignment and simulate grading after 500ms
  submitAssignment(assignmentName) {
    let assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      assignment = new Assignment(assignmentName);
      this.assignmentStatuses.push(assignment);
      this._notifyObserver(assignment); // released
    }

    // no-op if already submitted or graded
    if (
      assignment.status === "submitted" ||
      assignment.status === "Pass" ||
      assignment.status === "Fail"
    ) {
      return;
    }

    if (assignment._workTimeoutId) {
      clearTimeout(assignment._workTimeoutId);
      assignment._workTimeoutId = null;
    }

    assignment.status = "submitted";
    this._notifyObserver(assignment);

    setTimeout(() => {
      if (assignment._graded) return;

      const grade = Math.floor(Math.random() * 101); // 0–100
      assignment.setGrade(grade);
      this._notifyObserver(assignment);
      this._recalculateOverallGrade();
    }, 500);
  }

  // Return current overall average
  getGrade() {
    return this._recalculateOverallGrade();
  }
}

// Manages the class list and class-wide operations
class ClassList {
  constructor(observer) {
    this.students = [];
    this.observer = observer;
  }

  // Add a student and print the required message
  addStudent(student) {
    if (student && !this.students.includes(student)) {
      this.students.push(student);
      console.log(`${student.fullName} has been added to the classlist.`);
    }
  }

  // Remove by object or by full name string
  removeStudent(studentOrName) {
    const name =
      typeof studentOrName === "string"
        ? studentOrName
        : studentOrName.fullName;

    this.students = this.students.filter((s) => s.fullName !== name);
  }

  // Look up student by full name
  findStudentByName(name) {
    return this.students.find((s) => s.fullName === name) || null;
  }

  // Find students with outstanding work
  // If assignmentName provided: check that specific assignment.
  // If not: any assignment that is released/working/final reminder.
  findOutstandingAssignments(assignmentName) {
    const result = [];

    if (assignmentName) {
      this.students.forEach((student) => {
        const assignment = student.assignmentStatuses.find(
          (a) => a.assignmentName === assignmentName
        );
        if (
          assignment &&
          assignment.status !== "submitted" &&
          assignment.status !== "Pass" &&
          assignment.status !== "Fail"
        ) {
          result.push(student.fullName);
        }
      });
    } else {
      this.students.forEach((student) => {
        const hasOutstanding = student.assignmentStatuses.some((a) =>
          ["released", "working", "final reminder"].includes(a.status)
        );
        if (hasOutstanding) {
          result.push(student.fullName);
        }
      });
    }

    return result;
  }

  // Release assignments to all students using Promise.all in parallel
  async releaseAssignmentsParallel(assignmentNames) {
    const releasePromises = assignmentNames.map((assignmentName) =>
      Promise.all(
        this.students.map(
          (student) =>
            new Promise((resolve) => {
              setTimeout(() => {
                student.updateAssignmentStatus(assignmentName);
                resolve();
              }, 0);
            })
        )
      )
    );

    await Promise.all(releasePromises);
  }

  // Send a reminder for a specific assignment and force submission
  sendReminder(assignmentName) {
    const outstanding = this.findOutstandingAssignments(assignmentName);

    this.students.forEach((student) => {
      if (!outstanding.includes(student.fullName)) return;

      let assignment = student.assignmentStatuses.find(
        (a) => a.assignmentName === assignmentName
      );

      if (!assignment) {
        student.updateAssignmentStatus(assignmentName);
        assignment = student.assignmentStatuses.find(
          (a) => a.assignmentName === assignmentName
        );
      }

      assignment.status = "final reminder";

      // Notify via the shared observer instead of using student's private helper
      if (this.observer && typeof this.observer.notify === "function") {
        this.observer.notify(student, assignment, true);
      }

      if (assignment._workTimeoutId) {
        clearTimeout(assignment._workTimeoutId);
        assignment._workTimeoutId = null;
      }

      student.submitAssignment(assignmentName);
    });
  }
}

// Export for Gradescope / tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Assignment,
    Student,
    Observer,
    ClassList,
  };
}
