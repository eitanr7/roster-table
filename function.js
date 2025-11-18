window.function = function (facilitatorsData, shiftsData, startDate, endDate, locations, previewShift, previewFacs, state) {
	try {
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
	  
		console.log('Preview value:', preview, 'Type:', typeof preview);
		console.log('Preview facilitators:', previewFacilitators);
		
		// Return undefined if required inputs are missing
		if (!facilitators || !shifts) {
			return undefined;
		}
	
	// Reusable style definitions
	const statusStyles = {
		'VIC': {
			background: 'color-mix(in srgb, rgb(var(--ee-green-rgb)) 35%, white)',
			borderColor: 'var(--ee-green)',
			textColor: 'var(--gv-text-base)'
		},
		'NSW': {
			background: 'color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white)',
			borderColor: 'var(--ee-lightBlue)',
			textColor: 'var(--gv-text-base)'
		},
		'MAYBE': {
			background: 'var(--gv-border-base)',
			borderColor: 'var(--gv-border-dark)',
			textColor: 'var(--gv-text-base)'
		},
		'NREG': {
			background: 'color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 10%, white)',
			borderColor: 'color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 50%, white)',
			textColor: 'var(--gv-text-base)'
		},
		'VREG': {
			background: 'color-mix(in srgb, rgb(var(--ee-green-rgb)) 10%, white)',
			borderColor: 'color-mix(in srgb, rgb(var(--ee-green-rgb)) 50%, white)',
			textColor: 'var(--gv-text-base)'
		},
		'QLD': {
			background: 'color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white)',
			borderColor: 'var(--ee-orange)',
			textColor: 'var(--gv-text-base)'
		},
		'QREG': {
			background: 'color-mix(in srgb, rgb(var(--ee-orange-rgb)) 10%, white)',
			borderColor: 'color-mix(in srgb, rgb(var(--ee-orange-rgb)) 50%, white)',
			textColor: 'var(--gv-text-base)'
		},
		'SA': {
			background: 'rgb(var(--ee-pink-rgb))',
			borderColor: 'var(--ee-pink)',
			textColor: 'var(--gv-text-base)'
		},
		'SREG': {
			background: 'color-mix(in srgb, rgb(var(--ee-pink-rgb)) 10%, white)',
			borderColor: 'color-mix(in srgb, rgb(var(--ee-pink-rgb)) 50%, white)',
			textColor: 'var(--gv-text-base)'
		},
		'CAL-DATE': {
			background: 'rgba(var(--ee-blue-rgb), 0.08)',
			borderColor: 'var(--gv-border-base)',
			textColor: 'var(--gv-text-accent)'
		},
		'unavailable': {
			background: 'var(--gv-border-base)!important;',
			borderColor: 'var(--gv-border-dark)',
			textColor: 'var(--gv-text-base)',
			statusText: ' UNAVAILABLE'
		},
		'allDay': {
			background: 'var(--gv-border-base)!important;',
			borderColor: 'var(--gv-border-dark)',
			textColor: 'var(--gv-text-base)',
			statusText: ' ALL DAY'
		}
	};

	const locationBackgrounds = {
		'VIC': 'color-mix(in srgb, rgb(var(--ee-green-rgb)) 60%, white)',
		'NSW': 'color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 70%, white)',
		'MAYBE': 'var(--gv-border-dark)',
		'NREG': 'color-mix(in srgb, rgb(var(--ee-lightBlue-rgb)) 30%, white)',
		'VREG': 'color-mix(in srgb, rgb(var(--ee-green-rgb)) 30%, white)',
		'QLD': 'color-mix(in srgb, rgb(var(--ee-orange-rgb)) 70%, white)',
		'QREG': 'color-mix(in srgb, rgb(var(--ee-orange-rgb)) 30%, white)',
		'SA': 'color-mix(in srgb, rgb(var(--ee-pink-rgb)) 90%, black)',
		'SREG': 'color-mix(in srgb, rgb(var(--ee-pink-rgb)) 30%, white)',
		'CAL-DATE': 'var(--gv-border-base)',
		'unavailable': 'var(--gv-border-base)',
		'allDay': 'var(--gv-border-base)'
	};

	const shiftStyles = {
		common: {
			container: 'border-radius: 0.75rem; padding: 0.5rem 0.6rem 0.5rem 0.6rem; margin: 2px 0; font-size: 14px; width: 100%; box-sizing: border-box;',
			time: 'font-weight: 500; font-size: 11px;'
		},
		location: {
			base: 'white-space: nowrap; overflow: hidden; text-overflow: clip; border-radius: 0.5rem; padding: 0.25em 0.4em; margin-top: 0.4rem; font-size: 14px; font-weight: 500; display: inline-block; max-width: 160px;'
		},
		notes: 'font-size: 14px; color: var(--gv-text-base); margin-top: 0.2rem; display: none; transition: opacity 0.2s ease;'
	};

	const tableStyles = {
		main: 'border-collapse: collapse; table-layout: fixed; font-size: 14px;',
		firstRow: 'border-right: thin solid var(--gv-border-base); border-bottom: thin solid var(--gv-border-base); position: sticky; left: 0; background-color: var(--gv-bg-container-base); mask-image: linear-gradient(90deg, rgba(255, 255, 255, 1) 90%, rgba(255, 255, 255, 0) 100%);',
		regularRow: 'border-top: thin solid var(--gv-border-base); border-right: thin solid var(--gv-border-base); border-bottom: thin solid var(--gv-border-base); position: sticky; left: 0; background-color: var(--gv-bg-container-base); mask-image: linear-gradient(90deg, rgba(255, 255, 255, 1) 90%, rgba(255, 255, 255, 0) 100%);',
		firstRowCell: 'border-left: 1px solid var(--gv-border-base); border-right: thin solid var(--gv-border-base); border-bottom: thin solid var(--gv-border-base);',
		regularCell: 'border: thin solid var(--gv-border-base);',
		cellContent: 'padding: 8px; text-align: left; vertical-align: top; min-height: 40px; width: 200px;',
		nameCell: 'padding: 8px; text-align: left; vertical-align: top; font-weight: 500; width: 200px;'
	};

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

	// Helper function to parse date string to YYYY-MM-DD format (cached)
	const dateCache = new Map();
	function parseDateString(dateValue) {
		if (!dateValue) return null;
		if (dateCache.has(dateValue)) {
			return dateCache.get(dateValue);
		}
		let dateString = null;
		if (dateValue.includes('T')) {
			dateString = new Date(dateValue).toISOString().split('T')[0];
		} else {
			const parsed = new Date(dateValue);
			if (!isNaN(parsed.getTime())) {
				dateString = parsed.toISOString().split('T')[0];
			}
		}
		if (dateString) {
			dateCache.set(dateValue, dateString);
		}
		return dateString;
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
	const p3State = stateValue || null;
	
	// Pre-compile state check for better performance
	const stateCheckCache = new Map();
	function checkStateMatch(shiftState) {
		if (!shiftState) return !p3State;
		if (stateCheckCache.has(shiftState)) {
			return stateCheckCache.get(shiftState);
		}
		const shiftStates = shiftState.split(',').map(s => s.trim());
		const matches = !p3State || shiftStates.includes(p3State);
		stateCheckCache.set(shiftState, matches);
		return matches;
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
		console.log('Processing preview shift...');
		// Parse preview shift data (Glide sends as JSON string)
		let previewShiftObj = null;
		try {
			previewShiftObj = JSON.parse(preview);
			console.log('Parsed preview object:', previewShiftObj);
		} catch (e) {
			console.error('Failed to parse previewShift:', e);
			previewShiftObj = null;
		}
		
		// Check if the object is empty (has no keys)
		const isEmptyObject = previewShiftObj && Object.keys(previewShiftObj).length === 0;
		console.log('Is empty object?', isEmptyObject);
		
		// Validate that preview shift has required fields and they're not empty
		if (previewShiftObj && 
			!isEmptyObject &&
			previewShiftObj.startDate && 
			previewShiftObj.endDate && 
			typeof previewShiftObj.startDate === 'string' &&
			typeof previewShiftObj.endDate === 'string' &&
			previewShiftObj.startDate.length > 0 &&
			previewShiftObj.endDate.length > 0) {
			console.log('Adding preview shift for facilitators:', previewFacilitators);
			
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
	
	// Create a unique key based on date range for clean re-renders
	const dateRangeKey = sortedDates.length > 0 ? `${sortedDates[0]}-${sortedDates[sortedDates.length - 1]}` : 'no-dates';
	
	// Sort facilitators by rosterOrder (custom ordering to match component)
	const sortedFacilitators = [...facilitatorsArray].sort((a, b) => {
		// Handle missing rosterOrder - put them at the end, sorted by name
		if (!a.rosterOrder && !b.rosterOrder) {
			return a.fullName.localeCompare(b.fullName);
		}
		if (!a.rosterOrder) return 1;
		if (!b.rosterOrder) return -1;
		
		// Custom sorting to match the exact component ordering
		// The component seems to use a specific character-based ordering
		const orderA = a.rosterOrder;
		const orderB = b.rosterOrder;
		
		// Compare character by character
		const minLength = Math.min(orderA.length, orderB.length);
		for (let i = 0; i < minLength; i++) {
			const charA = orderA.charCodeAt(i);
			const charB = orderB.charCodeAt(i);
			if (charA !== charB) {
				return charA - charB;
			}
		}
		
		// If one string is a prefix of the other, shorter comes first
		return orderA.length - orderB.length;
	});
	
	// Generate HTML using array for better performance
	// Fixed width for 7 days + name column (200px + 7*200px = 1600px)
	const htmlParts = [`<div key="${dateRangeKey}">
		<table style="${tableStyles.main} width: 1600px;">
			<tbody>`];
	
	// Pre-compute today's date string in local timezone
	const today = new Date();
	const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
	
	// Add rows for each facilitator
	sortedFacilitators.forEach((facilitator, index) => {
		const isFirstRow = index === 0;
		const borderStyle = isFirstRow ? tableStyles.firstRow : tableStyles.regularRow;
		
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
			avatarHtml = `<div style="width: 32px; height: 32px; border-radius: 50%; color: white; background-color: var(--ee-green); display: flex; align-items: center; justify-content: center; margin-right: 8px;">
			✓</div>`;
		} else if (hasShifts && !allShiftsConfirmed) {
			// Show orange circle with white tick
			avatarHtml = `<div style="width: 32px; height: 32px; border-radius: 50%; color: white; background-color: var(--ee-darkYellow); display: flex; align-items: center; justify-content: center; margin-right: 8px;">
			?</div>`;
		} else if (facilitator.avatar) {
			// Show regular avatar
			avatarHtml = `<img src="${facilitator.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 8px; vertical-align: middle;" />`;
		} else {
			avatarHtml = '';
		}
		
		// Format hours display (show whole numbers without decimals, otherwise 1 decimal place)
		const hoursFormatted = totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(1);
		const hoursDisplay = `🕐 ${hoursFormatted} hrs`;
		
		htmlParts.push(`<tr>
				<td style="${borderStyle} ${tableStyles.nameCell}">
					<div style="display: flex; align-items: center;">
						${avatarHtml}
						<div style="display: flex; flex-direction: column;">
							<span>${escapeHtml(facilitator.fullName)}</span>
							<span style="font-size: 11px; color: var(--gv-text-secondary); font-weight: 400; margin-top: 2px;">${hoursDisplay}</span>
						</div>
					</div>
				</td>`);
		
		// Add cells for each date
		sortedDates.forEach(date => {
			const cellBorderStyle = isFirstRow ? tableStyles.firstRowCell : tableStyles.regularCell;
			// Check if this date is a closed date or today and apply appropriate background
			// Closed takes precedence over today (matching CSS where closed rule comes after today)
			const isClosedDate = closedDates.has(date);
			const isToday = date === todayString;
			let dateStyle = '';
			if (isClosedDate) {
				dateStyle = 'background-color: rgba(var(--ee-red-rgb), 0.08) !important;';
			} else if (isToday) {
				dateStyle = 'background-color: rgba(var(--ee-blue-rgb), 0.08) !important;';
			}
			htmlParts.push(`<td style="${cellBorderStyle} ${tableStyles.cellContent} ${dateStyle}">`);
			
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
					const isPublished = !!shift.published; // Check if shift has a published date
					const isUnconfirmed = !isConfirmed && !isPreview && !isUnavailable && !isAllDay && !isPublished;
					
					// Get location text for all shifts
					const locationText = shift.locationName || (shift.locationID && locationMap[shift.locationID] ? locationMap[shift.locationID] : '');
					
					// Get notes text for all shifts
					const notesText = shift.notes || '';
					
					// Get display text - show both location and notes for all shifts
					// For unavailable/allDay shifts, use notes as primary display text
					// For regular shifts, use location as primary display text
					const displayText = (isUnavailable || isAllDay) ? notesText : locationText;
					
					// Set colors based on shiftStatus
					let shiftStyle, timeStyle, statusText = '';
					
					if (isUnavailable) {
						const currentStyle = statusStyles['unavailable'];
						shiftStyle = `background-color: ${currentStyle.background}; border: ${currentStyle.borderColor}; ${shiftStyles.common.container} color: ${currentStyle.textColor};`;
						timeStyle = `${shiftStyles.common.time} color: ${currentStyle.textColor};`;
						statusText = currentStyle.statusText;
					} else if (isAllDay) {
						const currentStyle = statusStyles['allDay'];
						shiftStyle = `background-color: ${currentStyle.background}; border: ${currentStyle.borderColor}; ${shiftStyles.common.container} color: ${currentStyle.textColor};`;
						timeStyle = `${shiftStyles.common.time} color: ${currentStyle.textColor};`;
						statusText = currentStyle.statusText;
					} else if (isConfirmed) {
						// Confirmed shift styling - colored background with solid border
						const currentStyle = statusStyles[shift.shiftStatus] || statusStyles['VIC'];
						
						shiftStyle = `background: ${currentStyle.background}; border: thin solid ${currentStyle.borderColor}; ${shiftStyles.common.container}`;
						timeStyle = `${shiftStyles.common.time} color: ${currentStyle.textColor};`;
					} else if (isPublished) {
						// Published shift styling - white background with solid border
						const currentStyle = statusStyles[shift.shiftStatus] || statusStyles['MAYBE'];
						
						shiftStyle = `background-color: white; border: thin solid ${currentStyle.borderColor}; ${shiftStyles.common.container} color: ${currentStyle.textColor};`;
						timeStyle = `${shiftStyles.common.time} color: ${currentStyle.textColor};`;

					} else if (isPreview || isUnconfirmed) {
						// Preview shift or unconfirmed shift styling - white background with dashed border
						const currentStyle = statusStyles[shift.shiftStatus] || statusStyles['MAYBE'];
						
						shiftStyle = `background-color: white; border: thin dashed ${currentStyle.borderColor}; ${shiftStyles.common.container} color: ${currentStyle.textColor};`;
						timeStyle = `${shiftStyles.common.time} color: ${currentStyle.textColor};`;

					} else {
						// Default to preview/unconfirmed styling
						const currentStyle = statusStyles[shift.shiftStatus] || statusStyles['MAYBE'];
						
						shiftStyle = `background-color: white; border: thin dashed ${currentStyle.borderColor}; ${shiftStyles.common.container} color: ${currentStyle.textColor};`;
						timeStyle = `${shiftStyles.common.time} color: ${currentStyle.textColor};`;
					}
					
					// Location bubble styling based on shift status
					let locationStyle = shiftStyles.location.base;
					
					if (isUnavailable) {
						const locationBg = locationBackgrounds['unavailable'];
						locationStyle += ` background: ${locationBg}; color: var(--gv-text-base);`;
					} else if (isAllDay) {
						const locationBg = locationBackgrounds['allDay'];
						locationStyle += ` background: ${locationBg}; color: var(--gv-text-base);`;
					} else if (isConfirmed) {
						// Confirmed shift location styling - solid colored background
						const locationBg = locationBackgrounds[shift.shiftStatus] || locationBackgrounds['MAYBE'];
						locationStyle += ` background: ${locationBg}; color: var(--gv-text-base);`;
					} else if (isPublished) {
						// Published shift location styling - solid colored background with solid border
						const locationBg = locationBackgrounds[shift.shiftStatus] || locationBackgrounds['MAYBE'];
						locationStyle += ` background: ${locationBg}; color: var(--gv-text-base); border: 1px solid ${locationBg.replace('color-mix(in srgb, ', '').replace(')', '').split(',')[0]};`;
					} else if (shift.isPreview || isUnconfirmed) {
						// Preview or unconfirmed shift location styling - transparent background with dashed border
						const currentStyle = statusStyles[shift.shiftStatus] || statusStyles['MAYBE'];
						locationStyle += ` background: transparent; color: var(--gv-text-base); border: 1px dashed ${currentStyle.borderColor};`;
					} else {
						// Default to preview/unconfirmed styling - transparent with dashed border
						const currentStyle = statusStyles[shift.shiftStatus] || statusStyles['MAYBE'];
						locationStyle += ` background: transparent; color: var(--gv-text-base); border: 1px dashed ${currentStyle.borderColor};`;
					}
					
					// Add hover class for all shifts with notes
					const hoverClass = notesText ? ' shift-with-notes' : '';
					
					htmlParts.push(`<div class="shift-container${hoverClass}" style="${shiftStyle}">`);
					
					// Only show time for non-allDay shifts
					if (!isAllDay) {
						// For unavailable shifts that are not all day, just show time without "Unavailable" text
						const displayStatusText = isUnavailable ? '' : statusText;
						const notesIndicator = notesText ? ' ⓘ' : '';
						htmlParts.push(`<div style="${timeStyle}">${escapeHtml(startTimeFormatted)} - ${escapeHtml(endTimeFormatted)}${escapeHtml(displayStatusText)}${notesIndicator}</div>`);
					} else {
						// For allDay shifts (regardless of unavailable status), just show "All Day"
						const notesIndicator = notesText ? ' ⓘ' : '';
						htmlParts.push(`<div style="${timeStyle}">ALL DAY${notesIndicator}</div>`);
					}
					
					// Show content based on shift type
					if (isUnavailable || isAllDay) {
						// For unavailable/allDay shifts, show notes as primary content
						if (displayText) {
							htmlParts.push(`<div class="shift-notes" style="${shiftStyles.notes}">${escapeHtml(displayText)}</div>`);
						}
					} else {
						// For regular shifts, show location and notes
						if (locationText) {
							htmlParts.push(`<div style="${locationStyle}" title="${escapeHtml(locationText)}">${escapeHtml(locationText)}</div>`);
						}
						if (notesText) {
							htmlParts.push(`<div class="shift-notes" style="${shiftStyles.notes}">${escapeHtml(notesText)}</div>`);
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
	</div>`);
	
		let final = htmlParts.join('');
		
		console.log('Function completed successfully, returning HTML of length:', final.length);

		return final;
	} catch (error) {
		console.error('Error in roster table function:', error);
		console.error('Error stack:', error.stack);
		// Return a visible error message so we know what went wrong
		return `<div style="padding: 20px; color: red; border: 2px solid red; border-radius: 8px; margin: 20px;">
			<h3>Error rendering roster table</h3>
			<p><strong>Error:</strong> ${error.message}</p>
			<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack}</pre>
		</div>`;
	}
}
