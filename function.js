window.function = function (facilitatorsData, shiftsData, startDate, endDate, locations, previewShift, previewFacs, state) {
	// Extract the .value from each parameter and assign default values for undefined inputs
	const facilitators = facilitatorsData.value ?? "[]";
	const shifts = shiftsData.value ?? "[]";
	const start = startDate.value ?? "2027-05-03T00:00:00.000Z";
	const end = endDate.value ?? "2027-05-09T23:59:00.000Z";
	const locationsValue = locations.value ?? "";
	let preview = previewShift.value ?? "{}";
	// Handle edge cases where preview might be null, undefined, or empty string
	if (!preview || preview === "" || preview === "null" || preview === "undefined") {
		preview = "{}";
	}
	const previewFacilitators = previewFacs.value ?? "";
	const stateValue = state.value ?? "VIC";
	
	// Return undefined if required inputs are missing //
	if (!facilitators || !shifts) {
		return undefined;
	}
	
	// Helper to get status class name
	function getStatusClass(status) {
		return 'status-' + (status || 'maybe').toLowerCase();
	}

	// Helper function to escape HTML to prevent XSS
	function escapeHtml(text) {
		if (!text) return '';
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return String(text).replace(/[&<>"']/g, m => map[m]);
	}

	// Helper function to parse date string to YYYY-MM-DD format
	function parseDateString(dateValue) {
		if (!dateValue) return null;
		if (dateValue.includes('T')) {
			return dateValue.split('T')[0];
		}
		const parsed = new Date(dateValue);
		return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
	}

	// Helper function to format time (12-hour format)
	function formatTime(timeStr) {
		const [hours, minutes] = timeStr.split(':');
		const hour24 = parseInt(hours, 10);
		const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
		const ampm = hour24 >= 12 ? 'PM' : 'AM';
		return `${hour12}:${minutes} ${ampm}`;
	}

	// Handle JSON strings from Glide
	// Glide sends comma-separated objects without array brackets, so we wrap them
	const facilitatorsArray = JSON.parse(`[${facilitators}]`);
	const shiftsArray = JSON.parse(`[${shifts}]`);
	
	// Parse locations data if provided
	let locationsArray = null;
	if (locationsValue) {
		try {
			// Glide sends comma-separated objects without array brackets, so we wrap them
			locationsArray = JSON.parse(`[${locationsValue}]`);
		} catch (e) {
			console.error('Failed to parse locations:', e);
		}
	}
	
	// Create a map of locationID to location name
	const locationMap = {};
	if (locationsArray && Array.isArray(locationsArray)) {
		locationsArray.forEach(location => {
			locationMap[location.rowID] = location.name;
		});
	}
	
	// Parse closed dates from shiftsData - items that are both calDate and closedDay
	const closedDates = new Set();
	
	// Get state for filtering closed dates
	const cityState = stateValue || null;
	
	// Helper function to check state match
	function checkStateMatch(shiftState) {
		if (!shiftState) return !cityState;
		const shiftStates = shiftState.split(',').map(s => s.trim());
		return !cityState || shiftStates.includes(cityState);
	}
	
	// Separate calendar dates from regular shifts
	const regularShifts = [];
	
	shiftsArray.forEach(shift => {
		const isCalDate = shift.calDate === 'true' || shift.calDate === true;
		const isClosedDay = shift.closedDay === 'true' || shift.closedDay === true;
		
		if (isCalDate && isClosedDay) {
			// This is a closed date - check if stateValue is included in shift.state
			if (checkStateMatch(shift.state || null)) {
				const dateString = parseDateString(shift.date || shift.startDateTime);
				if (dateString) {
					closedDates.add(dateString);
				}
			}
			// Don't add this to regularShifts - it's a calendar date
		} else if (!isCalDate) {
			// This is a regular facilitator shift
			regularShifts.push(shift);
		}
	});
	
	// Parse date range from startDate and endDate parameters
	let allDates = new Set();
	
	if (start && end) {
		// Parse dates without timezone conversion
		const startDateStr = start.includes('T') ? start.split('T')[0] : start; // Extract YYYY-MM-DD
		const endDateStr = end.includes('T') ? end.split('T')[0] : end; // Extract YYYY-MM-DD
		
		// Create dates in UTC to avoid timezone conversion
		const startDateObj = new Date(startDateStr + 'T00:00:00.000Z');
		const endDateObj = new Date(endDateStr + 'T23:59:59.999Z');
		
		// Generate dates without timezone conversion
		const currentDate = new Date(startDateObj);
		
		while (currentDate <= endDateObj) {
			const dateString = currentDate.toISOString().split('T')[0];
			allDates.add(dateString);
			currentDate.setUTCDate(currentDate.getUTCDate() + 1);
		}
	}
	
	// Group regular shifts by date and facilitator (using filtered regularShifts instead of all shifts)
	const shiftsByDate = {};
	
	regularShifts.forEach(shift => {
		const date = parseDateString(shift.date); // Get YYYY-MM-DD format (cached)
		if (!date) return; // Skip if date parsing failed
		allDates.add(date); // Also add dates from shifts in case they're outside the range
		
		if (!shiftsByDate[date]) {
			shiftsByDate[date] = {};
		}
		
		const facilitatorEmail = shift.facilitator;
		if (!shiftsByDate[date][facilitatorEmail]) {
			shiftsByDate[date][facilitatorEmail] = [];
		}
		
		shiftsByDate[date][facilitatorEmail].push(shift);
	});
	
	// Add preview shifts for each faculty member in previewFacs
	if (preview && preview !== "{}" && previewFacilitators) {
		// Parse preview shift data (Glide sends as JSON string)
		let previewShiftObj = null;
		try {
			previewShiftObj = JSON.parse(preview);
		} catch (e) {
			previewShiftObj = null;
		}
		
		// Validate that preview shift has required fields and they're not empty
		if (previewShiftObj && 
			Object.keys(previewShiftObj).length > 0 &&
			previewShiftObj.startDate && 
			previewShiftObj.endDate && 
			typeof previewShiftObj.startDate === 'string' &&
			typeof previewShiftObj.endDate === 'string' &&
			previewShiftObj.startDate.length > 0 &&
			previewShiftObj.endDate.length > 0) {
			
			const previewFacsArray = [...new Set(previewFacilitators.split(',').map(email => email.trim()).filter(email => email))];
			
			// Parse preview shift date
			const previewDate = parseDateString(previewShiftObj.startDate);
			
			// Validate that the date was parsed successfully and we have facilitators
			if (previewDate && previewFacsArray.length > 0) {
				allDates.add(previewDate);
				
				if (!shiftsByDate[previewDate]) {
					shiftsByDate[previewDate] = {};
				}
				
				// Create preview shift object for each faculty member
				previewFacsArray.forEach(facEmail => {
					if (!shiftsByDate[previewDate][facEmail]) {
						shiftsByDate[previewDate][facEmail] = [];
					}
				
					const previewShiftData = {
						startDateTime: previewShiftObj.startDate,
						endDateTime: previewShiftObj.endDate,
						locationID: null, // We'll use locationName directly
						locationName: previewShiftObj.locationName || '',
						shiftStatus: previewShiftObj.status || 'MAYBE', // Use the status from previewShift, default to MAYBE
						isPreview: true,
						unavailable: false,
						allDay: false
					};
				
					shiftsByDate[previewDate][facEmail].push(previewShiftData);
				});
			}
		}
	}
	
	// Pre-sort all shifts by start time AFTER adding preview shifts
	Object.keys(shiftsByDate).forEach(date => {
		Object.keys(shiftsByDate[date]).forEach(facEmail => {
			shiftsByDate[date][facEmail].sort((a, b) => {
				const timeA = new Date(a.startDateTime).getTime();
				const timeB = new Date(b.startDateTime).getTime();
				// Handle invalid dates (NaN values) - put them at the end
				if (isNaN(timeA)) return 1;
				if (isNaN(timeB)) return -1;
				return timeA - timeB;
			});
		});
	});
	
	// Sort dates
	const sortedDates = Array.from(allDates).sort();
	
	// Sort facilitators by rosterOrder
	const sortedFacilitators = [...facilitatorsArray].sort((a, b) => {
		// Handle missing rosterOrder - put them at the end, sorted by name
		if (!a.rosterOrder && !b.rosterOrder) return a.fullName.localeCompare(b.fullName);
		if (!a.rosterOrder) return 1;
		if (!b.rosterOrder) return -1;
		
		// Compare rosterOrder strings
		return a.rosterOrder.localeCompare(b.rosterOrder);
	});
	
	// Pre-compute today's date string in local timezone (do this before HTML generation)
	const today = new Date();
	const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
	
	// Generate HTML using array for better performance
	const htmlParts = [`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		@font-face {
			font-family: 'Euclid Circular A';
			src: url('https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/AM6HpFEY5Q2u77eTnXED/pub/HOrLiKPfjk0ACw3Q6Hcb.woff2') format('woff2');
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}

		@font-face {
			font-family: 'Euclid Circular A';
			src: url('https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/AM6HpFEY5Q2u77eTnXED/pub/8kP9iLAOBxPtiNKkXfit.woff2') format('woff2');
			font-weight: 500;
			font-style: normal;
			font-display: swap;
		}

		:root {
			--gv-border-base: rgba(51, 51, 51, 0.08);
			--gv-border-dark: rgba(51, 51, 51, 0.15);
			--gv-bg-container-base: #FAFAFA;
			--gv-text-base: rgba(0, 0, 0, 0.95);

			/* global colour variables */
			--ee-red: #EF0849;
			--ee-red-rgb: 239, 8, 73;

			--ee-darkRed: #b20939;
			--ee-darkRed-rgb: 178, 9, 57;
			
			--ee-yellow: #FFC020;
			--ee-yellow-rgb: 255, 192, 32;

			--ee-darkYellow: #ffae00;
			--ee-darkYellow-rgb: 255, 174, 0;

			--ee-green: rgb(0, 177, 82);
			--ee-green-rgb: 0, 177, 82;

			--ee-blue: #1A77FF;
			--ee-blue-rgb: 26, 119, 255;

			--ee-lightBlue: #1ABCFF;
			--ee-lightBlue-rgb: 26, 188, 255;

			--ee-purple: #A289F7;
			--ee-purple-rgb: 162, 137, 247;

			--ee-pink: #FBB8F3;
			--ee-pink-rgb: 251, 184, 243;

			--ee-darkPink: #fc8def;
			--ee-darkPink-rgb: 252, 141, 239;

			--ee-orange: #FF7434;
			--ee-orange-rgb: 255, 116, 52;

			--ee-brown: #8B4513;
			--ee-brown-rgb: 139, 69, 19;
		}

		body {
			font-family: 'Euclid Circular A', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			margin: 0;
		}

		/* FAC SHIFTS CELL STYLING */
		.shift-container {
			transition: transform 0.2s ease-in-out!important;
		}

		.shift-container:hover {
			transform: scale(1.03)!important;
			transition: transform 0.2s ease-in-out!important;
		}

		.shift-with-notes:hover .shift-notes {
			display: block !important;
		}

		/* Roster Table Styles */
		.roster-table {
			border-collapse: collapse;
			table-layout: fixed;
			font-size: 14px;
			width: 1600px;
		}

		/* Row Styles */
		.roster-row-first {
			border-right: thin solid var(--gv-border-base);
			border-bottom: thin solid var(--gv-border-base);
			position: sticky;
			left: 0;
			background-color: var(--gv-bg-container-base);
			mask-image: linear-gradient(90deg, rgba(255, 255, 255, 1) 90%, rgba(255, 255, 255, 0) 100%);
		}

		.roster-row-regular {
			border-top: thin solid var(--gv-border-base);
			border-right: thin solid var(--gv-border-base);
			border-bottom: thin solid var(--gv-border-base);
			position: sticky;
			left: 0;
			background-color: var(--gv-bg-container-base);
			mask-image: linear-gradient(90deg, rgba(255, 255, 255, 1) 90%, rgba(255, 255, 255, 0) 100%);
		}

		/* Cell Styles */
		.roster-cell-first {
			border-left: 1px solid var(--gv-border-base);
			border-right: thin solid var(--gv-border-base);
			border-bottom: thin solid var(--gv-border-base);
		}

		.roster-cell-regular {
			border: thin solid var(--gv-border-base);
		}

		.roster-cell-content {
			padding: 8px;
			text-align: left;
			vertical-align: top;
			min-height: 40px;
			width: 200px;
		}

		.roster-cell-name {
			padding: 8px;
			text-align: left;
			vertical-align: top;
			font-weight: 500;
			width: 200px;
		}

		.roster-cell-today {
			background-color: rgba(var(--ee-blue-rgb), 0.08) !important;
		}

		.roster-cell-closed {
			background-color: rgba(var(--ee-red-rgb), 0.08) !important;
		}

		/* Shift Container */
		.shift-container {
			border-radius: 0.75rem;
			padding: 0.5rem 0.6rem;
			margin: 2px 0;
			font-size: 14px;
			width: 100%;
			box-sizing: border-box;
		}

		.shift-time {
			font-weight: 500;
			font-size: 11px;
		}

		/* Shift Status - Unavailable/All Day */
		.shift-unavailable {
			background-color: var(--gv-border-base) !important;
			border: var(--gv-border-dark);
			color: var(--gv-text-base);
		}

		.shift-allday {
			background-color: var(--gv-border-base) !important;
			border: var(--gv-border-dark);
			color: var(--gv-text-base);
		}

		/* Shift Status - Confirmed (Colored backgrounds) */
		.shift-confirmed {
			border: thin solid;
		}

		.shift-confirmed.status-vic {
			background: color-mix(in srgb, rgb(var(--ee-green-rgb)) 35%, white);
			border-color: var(--ee-green);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-nsw {
			background: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white);
			border-color: var(--ee-lightBlue);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-vreg {
			background: color-mix(in srgb, rgb(var(--ee-green-rgb)) 10%, white);
			border-color: color-mix(in srgb, rgb(var(--ee-green-rgb)) 50%, white);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-nreg {
			background: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 10%, white);
			border-color: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-qld {
			background: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white);
			border-color: var(--ee-orange);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-qreg {
			background: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 10%, white);
			border-color: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-sa {
			background: rgb(var(--ee-pink-rgb));
			border-color: var(--ee-pink);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-sreg {
			background: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 10%, white);
			border-color: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 50%, white);
			color: var(--gv-text-base);
		}

		.shift-confirmed.status-maybe {
			background: var(--gv-border-base);
			border-color: var(--gv-border-dark);
			color: var(--gv-text-base);
		}

		/* Shift Status - Published (White background, solid border) */
		.shift-published {
			background-color: white;
			border: thin solid;
		}

		.shift-published.status-vic { border-color: var(--ee-green); color: var(--gv-text-base); }
		.shift-published.status-nsw { border-color: var(--ee-lightBlue); color: var(--gv-text-base); }
		.shift-published.status-vreg { border-color: color-mix(in srgb, rgb(var(--ee-green-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-published.status-nreg { border-color: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-published.status-qld { border-color: var(--ee-orange); color: var(--gv-text-base); }
		.shift-published.status-qreg { border-color: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-published.status-sa { border-color: var(--ee-pink); color: var(--gv-text-base); }
		.shift-published.status-sreg { border-color: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-published.status-maybe { border-color: var(--gv-border-dark); color: var(--gv-text-base); }

		/* Shift Status - Unconfirmed/Preview (White background, dashed border) */
		.shift-unconfirmed {
			background-color: white;
			border: thin dashed;
		}

		.shift-unconfirmed.status-vic { border-color: var(--ee-green); color: var(--gv-text-base); }
		.shift-unconfirmed.status-nsw { border-color: var(--ee-lightBlue); color: var(--gv-text-base); }
		.shift-unconfirmed.status-vreg { border-color: color-mix(in srgb, rgb(var(--ee-green-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-unconfirmed.status-nreg { border-color: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-unconfirmed.status-qld { border-color: var(--ee-orange); color: var(--gv-text-base); }
		.shift-unconfirmed.status-qreg { border-color: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-unconfirmed.status-sa { border-color: var(--ee-pink); color: var(--gv-text-base); }
		.shift-unconfirmed.status-sreg { border-color: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 50%, white); color: var(--gv-text-base); }
		.shift-unconfirmed.status-maybe { border-color: var(--gv-border-dark); color: var(--gv-text-base); }

		/* Location Bubble */
		.shift-location {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			border-radius: 0.5rem;
			padding: 0.25em 0.4em;
			margin-top: 0.4rem;
			font-size: 14px;
			font-weight: 500;
			display: inline-block;
			max-width: 160px;
		}

		/* Location - Confirmed (Solid colored background) */
		.location-confirmed.status-vic { background: color-mix(in srgb, rgb(var(--ee-green-rgb)) 60%, white); color: var(--gv-text-base); }
		.location-confirmed.status-nsw { background: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 70%, white); color: var(--gv-text-base); }
		.location-confirmed.status-vreg { background: color-mix(in srgb, rgb(var(--ee-green-rgb)) 30%, white); color: var(--gv-text-base); }
		.location-confirmed.status-nreg { background: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 30%, white); color: var(--gv-text-base); }
		.location-confirmed.status-qld { background: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 70%, white); color: var(--gv-text-base); }
		.location-confirmed.status-qreg { background: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 30%, white); color: var(--gv-text-base); }
		.location-confirmed.status-sa { background: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 90%, black); color: var(--gv-text-base); }
		.location-confirmed.status-sreg { background: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 30%, white); color: var(--gv-text-base); }
		.location-confirmed.status-maybe { background: var(--gv-border-dark); color: var(--gv-text-base); }
		.location-confirmed.status-unavailable { background: var(--gv-border-base); color: var(--gv-text-base); }
		.location-confirmed.status-allday { background: var(--gv-border-base); color: var(--gv-text-base); }

		/* Location - Published (Solid background with border) */
		.location-published {
			border: 1px solid;
			color: var(--gv-text-base);
		}

		.location-published.status-vic { background: color-mix(in srgb, rgb(var(--ee-green-rgb)) 60%, white); border-color: var(--ee-green); }
		.location-published.status-nsw { background: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 70%, white); border-color: var(--ee-lightBlue); }
		.location-published.status-vreg { background: color-mix(in srgb, rgb(var(--ee-green-rgb)) 30%, white); border-color: color-mix(in srgb, rgb(var(--ee-green-rgb)) 50%, white); }
		.location-published.status-nreg { background: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 30%, white); border-color: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white); }
		.location-published.status-qld { background: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 70%, white); border-color: var(--ee-orange); }
		.location-published.status-qreg { background: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 30%, white); border-color: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white); }
		.location-published.status-sa { background: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 90%, black); border-color: var(--ee-pink); }
		.location-published.status-sreg { background: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 30%, white); border-color: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 50%, white); }
		.location-published.status-maybe { background: var(--gv-border-dark); border-color: var(--gv-border-dark); }

		/* Location - Unconfirmed/Preview (Transparent with dashed border) */
		.location-unconfirmed {
			background: transparent;
			border: 1px dashed;
			color: var(--gv-text-base);
		}

		.location-unconfirmed.status-vic { border-color: var(--ee-green); }
		.location-unconfirmed.status-nsw { border-color: var(--ee-lightBlue); }
		.location-unconfirmed.status-vreg { border-color: color-mix(in srgb, rgb(var(--ee-green-rgb)) 50%, white); }
		.location-unconfirmed.status-nreg { border-color: color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white); }
		.location-unconfirmed.status-qld { border-color: var(--ee-orange); }
		.location-unconfirmed.status-qreg { border-color: color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white); }
		.location-unconfirmed.status-sa { border-color: var(--ee-pink); }
		.location-unconfirmed.status-sreg { border-color: color-mix(in srgb, rgb(var(--ee-pink-rgb)) 50%, white); }
		.location-unconfirmed.status-maybe { border-color: var(--gv-border-dark); }

		/* Notes */
		.shift-notes {
			font-size: 14px;
			color: var(--gv-text-base);
			margin-top: 0.2rem;
			display: none;
			transition: opacity 0.2s ease;
		}

		.shift-with-notes:hover .shift-notes {
			display: block;
		}

		/* Facilitator Name Cell */
		.facilitator-info {
			display: flex;
			align-items: center;
		}

		.facilitator-details {
			display: flex;
			flex-direction: column;
		}

		.facilitator-hours {
			font-size: 11px;
			color: var(--gv-text-base);
			font-weight: 400;
			margin-top: 2px;
		}

		/* Avatar and Badges */
		.facilitator-avatar {
			width: 32px;
			height: 32px;
			border-radius: 50%;
			object-fit: cover;
			margin-right: 8px;
			vertical-align: middle;
		}

		.facilitator-badge {
			width: 32px;
			height: 32px;
			border-radius: 50%;
			color: white;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 8px;
		}

		.facilitator-badge-confirmed {
			background-color: var(--ee-green);
		}

		.facilitator-badge-pending {
			background-color: var(--ee-darkYellow);
		}
	</style>
</head>
<body>
	<div>
		<table class="roster-table">
			<tbody>`];
	
	// Add rows for each facilitator
	sortedFacilitators.forEach((facilitator, index) => {
		const isFirstRow = index === 0;
		const rowClass = isFirstRow ? 'roster-row-first' : 'roster-row-regular';
		
		// Check if all shifts for this facilitator are confirmed
		let allShiftsConfirmed = true;
		let hasShifts = false;
		let totalHours = 0;
		
		sortedDates.forEach(date => {
			const facilitatorShifts = shiftsByDate[date] && shiftsByDate[date][facilitator.email] 
				? shiftsByDate[date][facilitator.email] 
				: [];
			
			facilitatorShifts.forEach(shift => {
				// Only count actual shifts (not preview, not unavailable, not all day)
				if (!shift.isPreview && !shift.unavailable && !shift.allDay) {
					hasShifts = true;
					// Only confirmed shifts count for the green tick
					if (!shift.confirmed) {
						allShiftsConfirmed = false;
					}
					
					// Calculate hours for this shift
					if (shift.startDateTime && shift.endDateTime) {
						const startTime = new Date(shift.startDateTime).getTime();
						const endTime = new Date(shift.endDateTime).getTime();
						const durationHours = (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours
						totalHours += durationHours;
					}
				}
			});
		});
		
		// Build the name cell content with avatar or confirmation badge
		let avatarHtml;
		if (hasShifts && allShiftsConfirmed) {
			// Show green circle with white tick
			avatarHtml = `<div class="facilitator-badge facilitator-badge-confirmed">✓</div>`;
		} else if (hasShifts && !allShiftsConfirmed) {
			// Show orange circle with question mark
			avatarHtml = `<div class="facilitator-badge facilitator-badge-pending">?</div>`;
		} else if (facilitator.avatar) {
			// Show regular avatar
			avatarHtml = `<img src="${facilitator.avatar}" class="facilitator-avatar" />`;
		} else {
			avatarHtml = '';
		}
		
		// Format hours display (show whole numbers without decimals, otherwise 1 decimal place)
		const hoursFormatted = totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(1);
		const hoursDisplay = `🕐 ${hoursFormatted} hrs`;
		
		htmlParts.push(`<tr>
				<td class="${rowClass} roster-cell-name">
					<div class="facilitator-info">
						${avatarHtml}
						<div class="facilitator-details">
							<span>${escapeHtml(facilitator.fullName)}</span>
							<span class="facilitator-hours">${hoursDisplay}</span>
						</div>
					</div>
				</td>`);
		
		// Add cells for each date
		sortedDates.forEach(date => {
			const cellClass = isFirstRow ? 'roster-cell-first' : 'roster-cell-regular';
			// Check if this date is a closed date or today and apply appropriate background
			const isClosedDate = closedDates.has(date);
			const isToday = date === todayString;
			let dateClass = '';
			if (isClosedDate) {
				dateClass = ' roster-cell-closed';
			} else if (isToday) {
				dateClass = ' roster-cell-today';
			}
			htmlParts.push(`<td class="${cellClass} roster-cell-content${dateClass}">`);
			
			const facilitatorShifts = shiftsByDate[date] && shiftsByDate[date][facilitator.email] 
				? shiftsByDate[date][facilitator.email] 
				: [];
			
			// Shifts are already pre-sorted, no need to sort again
			
			if (facilitatorShifts.length > 0) {
				facilitatorShifts.forEach(shift => {
					// Extract time from UTC string without timezone conversion (cached)
					const startDateTime = shift.startDateTime;
					const endDateTime = shift.endDateTime;
					const startTime = startDateTime ? new Date(startDateTime).toISOString().substr(11, 5) : '';
					const endTime = endDateTime ? new Date(endDateTime).toISOString().substr(11, 5) : '';
					
					const startTimeFormatted = startTime ? formatTime(startTime) : '';
					const endTimeFormatted = endTime ? formatTime(endTime) : '';
					
				// Pre-compute shift properties once
				const isUnavailable = shift.unavailable === true || shift.unavailable === 'true';
				const isAllDay = shift.allDay === true || shift.allDay === 'true';
				const isPreview = shift.isPreview === true;
				const isConfirmed = !!shift.confirmed;
				const isPublished = !!shift.published;
				const isUnconfirmed = !isConfirmed && !isPreview && !isUnavailable && !isAllDay && !isPublished;
				
				// Get location text for all shifts
				const locationText = shift.locationName || (shift.locationID && locationMap[shift.locationID] ? locationMap[shift.locationID] : '');
				
				// Get notes text for all shifts
				const notesText = shift.notes || '';
				
				// Get display text
				const displayText = (isUnavailable || isAllDay) ? notesText : locationText;
				
				// Determine CSS classes based on shift status
				let shiftClass = 'shift-container';
				let locationClass = 'shift-location';
				const statusClass = getStatusClass(shift.shiftStatus);
				
				if (isUnavailable) {
					shiftClass += ' shift-unavailable';
					locationClass += ' location-confirmed status-unavailable';
				} else if (isAllDay) {
					shiftClass += ' shift-allday';
					locationClass += ' location-confirmed status-allday';
				} else if (isConfirmed) {
					shiftClass += ' shift-confirmed ' + statusClass;
					locationClass += ' location-confirmed ' + statusClass;
				} else if (isPublished) {
					shiftClass += ' shift-published ' + statusClass;
					locationClass += ' location-published ' + statusClass;
				} else {
					// Unconfirmed or preview
					shiftClass += ' shift-unconfirmed ' + statusClass;
					locationClass += ' location-unconfirmed ' + statusClass;
				}
					
				// Add hover class for all shifts with notes
				const hoverClass = notesText ? ' shift-with-notes' : '';
				
				htmlParts.push(`<div class="${shiftClass}${hoverClass}">`);
				
				// Only show time for non-allDay shifts
				if (!isAllDay) {
					const notesIndicator = notesText ? ' ⓘ' : '';
					htmlParts.push(`<div class="shift-time">${escapeHtml(startTimeFormatted)} - ${escapeHtml(endTimeFormatted)}${notesIndicator}</div>`);
				} else {
					// For allDay shifts, just show "ALL DAY"
					const notesIndicator = notesText ? ' ⓘ' : '';
					htmlParts.push(`<div class="shift-time">ALL DAY${notesIndicator}</div>`);
				}
				
				// Show content based on shift type
				if (isUnavailable || isAllDay) {
					// For unavailable/allDay shifts, show notes as primary content
					if (displayText) {
						htmlParts.push(`<div class="shift-notes">${escapeHtml(displayText)}</div>`);
					}
				} else {
					// For regular shifts, show location and notes
					if (locationText) {
						htmlParts.push(`<div class="${locationClass}" title="${escapeHtml(locationText)}">${escapeHtml(locationText)}</div>`);
					}
					if (notesText) {
						htmlParts.push(`<div class="shift-notes">${escapeHtml(notesText)}</div>`);
					}
				}
				
				htmlParts.push(`</div>`);
				});
			}
			
			htmlParts.push(`</td>`);
		});
		
		htmlParts.push(`</tr>`);
	});
	
	htmlParts.push(`</tbody>
		</table>
	</div>
</body>
</html>`);
	
	const html = htmlParts.join('');
	const encodedHtml = encodeURIComponent(html);
	return "data:text/html;charset=utf-8," + encodedHtml;
}
