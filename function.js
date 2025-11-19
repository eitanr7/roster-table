window.function = function (facilitatorsData, shiftsData, startDate, endDate, locations, previewShift, previewFacs, state) {
	// Extract the .value from each parameter and assign default values for undefined inputs
	const facilitators = facilitatorsData.value ?? "";
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
	
	// Return message if there are no facilitators
	if (!facilitatorsArray || facilitatorsArray.length === 0 || facilitators === "[]") {
		return '<div class="no-facilitators-message">No facilitators available</div>';
	}
	
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
	const htmlParts = [`<div>
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
	</div>`);
	
	return htmlParts.join('');
}
