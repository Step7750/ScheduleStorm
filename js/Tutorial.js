class Tutorial {
	constructor() {
		// check localstorage to see whether we should start the tut or not
		if (localStorage.getItem("showTut") != "true") {
			console.log("Starting tutorial");
		}
	}
}
