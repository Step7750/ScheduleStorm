class Tutorial {
	constructor() {
		var self = this;

		// check localstorage to see whether we should start the tut or not
		if (localStorage.getItem("tour_end") == null && window.tourInProgress != true) {
			// Set a global defining our progress
			window.tourInProgress = true;

            // scroll to the top of the class data wraper
            $("#classdatawraper").scrollTop(0);

            // Repopulate the accordion to the default view
            classList.repopulateAccordion();

			setTimeout(function () {
				self.openAccordion();
			}, 500);
		}
	}

	/*
		Open the first top level for every level
	*/
	openAccordion() {
		this.openedAccordion = true;

		this.openChildRow($('#classdatawraper').children(0));
	}

	/*
		Opens the first row in the child of the specified element
	*/
	openChildRow(element) {
		var self = this;

		// Get the row
		var row = element.parent().find('.has-children').eq(0);

		if (row.length > 0) {

			// Ensure the row isn't open already, if not, click it
			if (row.find("ul").length == 1 && row.find(".accordiontableparent").length == 0) row.find('label').click();

			// Call the next row
			setTimeout(function () {
				self.openChildRow(row.find('label').eq(0));
			}, 50);
		}
		else {
			// start up the tour
			self.createIntro();
		}
	}

	/*
		Initialize and start the tour
	*/
	createIntro() {
		var self = this;

		var tour = new Tour({
		  	steps: [
			  	{
			    	title: "What is this?",
			    	content: "Schedule Storm is a student schedule generator that lets you input your courses and preferences to generate possible schedules. <br><br>You can always restart this tour by going to preferences"
			  	},
			  	{
			  		element: document.querySelector('#classdatawraper'),
			    	title: "Course List",
			    	content: "In this accordion, you can add and look at courses. Clicking on labels opens their contents."
			  	},
			  	{
			  		element: $("#classdatawraper").find('.addCourseButton')[0],
			  		title: "Add Courses",
			  		content: "If you want to add a course, simply click on the 'plus' icon next to its name"
			  	},
			  	{
			  		element: $("#classdatawraper").find('[classid]')[0],
			  		title: "Add Specific Classes",
			  		content: "If you want to add a specific class, you can click on the 'plus' icon next to it.<br><br>All other required classes will automatically be filled by the generator"
			  	},
			  	{
			  		element: $("#classdatawraper").find("td")[1],
			  		title: "Rate My Professor Ratings",
			  		content: "If you see a number beside a teacher's name, that is their Rate My Professor rating out of 5<br><br>You can specify the weighting of the RMP rating in the generator in preferences"
			  	},
			  	{
			  		element: $("#searchcourses")[0],
			  		title: "Search Courses",
			  		content: "Here you can search for teachers, courses, classes, rooms, descriptions, faculties, subjects, prerequisites...<br><br>Almost anything!"
			  	},
			  	{
			  		element: $("#locationselect")[0],
			  		title: "Change Location",
			  		content: "You can limit the location for classes to specific campuses or areas"
			  	},
			  	{
			  		element: $("#courseSelector").find(".input-group-btn")[1],
			  		title: "Change Term",
			  		content: "You can change the term you're viewing in this university"
			  	},
			  	{
			  		element: $("#MyCourses"),
			  		title: "My Courses",
			  		content: "All of your chosen courses are displayed here",
			  		placement: "left"
			  	},
			  	{
			  		element: $("#coursegroups"),
			  		title: "Course Groups",
			  		content: "You can create groups of courses where the generator fulfills every group. You can change/remove the group type by clicking on its 'pill'"
			  	},
			  	{
			  		element: $("#addGroupbtn"),
			  		title: "Adding Course Groups",
			  		content: "Clicking this will create a new course group<br><br>This is useful for electives where you only want one or two of the courses selected in the group"
			  	},
			  	{
			  		element: $("#schedule"),
			  		title: "Calendar",
			  		content: "You can look through possible schedules on this calendar",
			  		placement: "left"
			  	},
			  	{
			  		element: $("#calendarStatus"),
			  		title: "Blocking Timeslots",
			  		content: "You can block specific timeslots for the generator by clicking and dragging on the calendar<br><br>Clicking on a banned timeslot will unban it",
			  		placement: "left"
			  	},
			  	{
			  		element: $("#prevSchedule"),
			  		title: "Browsing Schedules",
			  		content: "You can browse possible schedules by clicking the previous and next buttons here",
			  		placement: "left"
			  	},
			  	{
			  		element: $("#scheduleutilities"),
			  		title: "Schedule Utilities",
			  		content: "Useful schedule utilities can be found here, you can:<br>* Download a picture of your schedule<br>* Copy your schedule to clipboard<br>* Remove all blocked timeslots<br>* Share your schedule to Facebook"
			  	},
			  	{
			  		element: $("#preferencesbutton"),
			  		title: "Preferences",
			  		content: "You can change your schedule preferences and edit settings by clicking this button<br><br>You can change your preferences for morning/night classes, consecutive classes, and teacher quality over time slots.<br><br>You can also specify that you only want the generator to allow open classes (some universities have custom settings)",
			  		placement: "left",
			  	},
			  	{
			  		element: $("#MyUniversity"),
			  		title: "Change University",
			  		content: "You can click here to open a dropdown and change your university",
			  		placement: "left"
			  	},
			  	{
			  		element: $("#aboutbutton"),
			  		title: "About Us",
			  		content: "We are two Computer Science students that thought there was a better way to make university schedules<br><br>Please contact us using Github or Email if you'd like to say 'Hi', file a bug report, want us to add your university, or add a new feature!",
			  		placement: "left"
			  	},
			  	{
			  		title: "That ended too soon!",
			  		content: "It looks like thats the end of our tour, remember you can always look at it again by going to preferences.<br><br>This project is completely open-source on Github and if you want to implement your university or add a feature, please do it!"
			  	}
			],
			backdrop: true,
			orphan: true,
			onEnd: function (tour) {
				window.tourInProgress = false;

				// repopulate the accordion with the default view
				classList.repopulateAccordion();
			}
		});

		// Initialize the tour
		tour.init();

		// Start the tour
		tour.start().goTo(0);
	}
}
