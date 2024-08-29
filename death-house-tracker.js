// death-house-tracker.js

class DeathHouseTracker {
    constructor() {
        this.groupOneClock = new Date(2024, 0, 1, 18, 0, 0); // Start at 6:00:00 PM
        this.groupTwoClock = new Date(2024, 0, 1, 18, 0, 0);
        this.isGroupSplit = false;
        this.eventLog = [];
        this.undoStack = [];
        this.redoStack = [];
        this.timeline = new VerticalTimeline(this);

        this.initializeEventListeners();
        this.loadState();
        this.updateTimeDisplay();
        this.timeline.render();
    }

    initializeEventListeners() {
        document.getElementById('split-button').addEventListener('click', () => this.toggleGroupSplit());
        document.querySelectorAll('.action-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const group = e.target.closest('button').dataset.group;
                this.performAction(action, group);
            });
        });
        document.getElementById('undo-button').addEventListener('click', () => this.undo());
        document.getElementById('redo-button').addEventListener('click', () => this.redo());
        document.getElementById('reset-button').addEventListener('click', () => this.resetTracker());
        document.getElementById('volume-control').addEventListener('input', (e) => this.setVolume(e.target.value));
        document.getElementById('mute-toggle').addEventListener('click', () => this.toggleMute());
    }

    updateTimeDisplay() {
        document.getElementById('group-one-time').textContent = `Group One: ${this.formatTime(this.groupOneClock)}`;
        document.getElementById('group-two-time').textContent = `Group Two: ${this.formatTime(this.groupTwoClock)}`;
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    addTime(minutes, seconds = 0, group) {
        const timeToAdd = minutes * 60000 + seconds * 1000;
        const oldTime = group === 'Group One' ? new Date(this.groupOneClock) : new Date(this.groupTwoClock);
        
        if (group === 'Group One') {
            this.groupOneClock = new Date(this.groupOneClock.getTime() + timeToAdd);
        } else {
            this.groupTwoClock = new Date(this.groupTwoClock.getTime() + timeToAdd);
        }
        
        const newTime = group === 'Group One' ? this.groupOneClock : this.groupTwoClock;
        
        this.checkPassedThresholds(oldTime, newTime, group);
        this.updateTimeDisplay();
        this.saveState();
    }

    checkPassedThresholds(oldTime, newTime, group) {
        // Check for passed hour
        const hoursPassed = (newTime.getHours() - oldTime.getHours() + 24) % 24;
        for (let i = 0; i < hoursPassed; i++) {
            this.playSound('hourly-chime');
        }
        
        // Check for passed midnight
        if ((oldTime.getHours() < 24 && newTime.getHours() >= 0 && oldTime.getDate() !== newTime.getDate()) ||
            (oldTime.getHours() === 23 && newTime.getHours() === 0)) {
            this.showMidnightAlert();
            this.playSound('midnight-sound');
        }
    }

    showMidnightAlert() {
        const alert = document.getElementById('midnight-alert');
        alert.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            alert.setAttribute('aria-hidden', 'true');
        }, 5000);
    }

    logEvent(action, group) {
        const time = group === 'Group One' ? this.groupOneClock : this.groupTwoClock;
        const logEntry = {
            time: new Date(time),
            action: action,
            group: group
        };
        this.eventLog.push(logEntry);
        this.timeline.addEvent(logEntry);
    }

    performAction(action, group) {
        const oldState = this.getState();
        this.undoStack.push(oldState);
        this.redoStack = [];

        let actionDescription;
        let timeToAdd;

        switch (action) {
            case 'newFloor':
                timeToAdd = { minutes: 20, seconds: 0 };
                actionDescription = 'Entered a new floor';
                break;
            case 'searchRoom':
                timeToAdd = { minutes: 20, seconds: 0 };
                actionDescription = 'Searched a room';
                break;
            case 'shortRest':
                timeToAdd = { minutes: 60, seconds: 0 };
                actionDescription = 'Took a short rest';
                break;
            case 'combat':
                timeToAdd = { minutes: 0, seconds: 10 };
                actionDescription = 'Completed a combat round';
                break;
            case 'ritualCasting':
                timeToAdd = { minutes: 10, seconds: 0 };
                actionDescription = 'Performed ritual casting';
                break;
            case 'taking20':
                timeToAdd = { minutes: 1, seconds: 0 };
                actionDescription = 'Took 20 on a check';
                break;
            case 'custom':
                timeToAdd = this.getCustomTimeInput();
                actionDescription = 'Custom time added';
                break;
        }

        this.addTime(timeToAdd.minutes, timeToAdd.seconds, group);
        this.logEvent(actionDescription, group);
    }

    getCustomTimeInput() {
        const minutes = parseInt(prompt("Enter minutes to add:", "0")) || 0;
        const seconds = parseInt(prompt("Enter seconds to add:", "0")) || 0;
        return { minutes, seconds };
    }

    toggleGroupSplit() {
        this.isGroupSplit = !this.isGroupSplit;
        const splitButton = document.getElementById('split-button');
        const groupTwoTime = document.getElementById('group-two-time');
        const groupTwoButtons = document.getElementById('group-two-buttons');
        
        if (this.isGroupSplit) {
            groupTwoTime.style.display = 'block';
            groupTwoButtons.style.display = 'flex';  // or 'grid', depending on your layout
            this.groupTwoClock = new Date(this.groupOneClock);
            splitButton.innerHTML = '<span class="icon" aria-hidden="true">👥</span>Back together';
            this.logEvent('Group split', 'Group One');
        } else {
            groupTwoTime.style.display = 'none';
            groupTwoButtons.style.display = 'none';
            if (this.groupTwoClock > this.groupOneClock) {
                this.groupOneClock = new Date(this.groupTwoClock);
            }
            splitButton.innerHTML = '<span class="icon" aria-hidden="true">👥</span>Let\'s split up gang!';
            this.logEvent('Groups reunited', 'Group One');
        }
    
        this.updateTimeDisplay();
        this.timeline.render();
        this.saveState();
    }

    undo() {
        if (this.undoStack.length > 0) {
            const currentState = this.getState();
            this.redoStack.push(currentState);
            const previousState = this.undoStack.pop();
            this.setState(previousState);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const currentState = this.getState();
            this.undoStack.push(currentState);
            const nextState = this.redoStack.pop();
            this.setState(nextState);
        }
    }

    resetTracker() {
        if (confirm("Are you sure you want to reset the tracker? This will clear all events and reset the time.")) {
            this.groupOneClock = new Date(2024, 0, 1, 18, 0, 0); // Reset to 6:00:00 PM
            this.groupTwoClock = new Date(2024, 0, 1, 18, 0, 0);
            this.isGroupSplit = false;
            this.eventLog = [];
            this.undoStack = [];
            this.redoStack = [];
            
            this.updateTimeDisplay();
            this.timeline.render();
            this.saveState();

            // Reset UI elements
            document.getElementById('group-two-time').hidden = true;
            document.getElementById('group-two-buttons').hidden = true;
            document.getElementById('split-button').innerHTML = '<span class="icon" aria-hidden="true">👥</span>Let\'s split up gang!';
        }
    }

    getState() {
        return {
            groupOneClock: this.groupOneClock.getTime(),
            groupTwoClock: this.groupTwoClock.getTime(),
            isGroupSplit: this.isGroupSplit,
            eventLog: this.eventLog.map(event => ({...event, time: event.time.getTime()}))
        };
    }

    setState(state) {
        this.groupOneClock = new Date(state.groupOneClock);
        this.groupTwoClock = new Date(state.groupTwoClock);
        this.isGroupSplit = state.isGroupSplit;
        this.eventLog = state.eventLog.map(event => ({...event, time: new Date(event.time)}));
        this.updateTimeDisplay();
        this.timeline.render();
        this.saveState();
    }

    saveState() {
        localStorage.setItem('deathHouseTrackerState', JSON.stringify(this.getState()));
    }

    loadState() {
        const savedState = localStorage.getItem('deathHouseTrackerState');
        if (savedState) {
            this.setState(JSON.parse(savedState));
        }
    }

    playSound(soundId) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.play().catch(error => console.error('Error playing sound:', error));
        }
    }

    setVolume(value) {
        const volume = parseFloat(value);
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = volume;
        });
    }

    toggleMute() {
        const muteToggle = document.getElementById('mute-toggle');
        const isMuted = muteToggle.classList.toggle('muted');
        document.querySelectorAll('audio').forEach(audio => {
            audio.muted = isMuted;
        });
    }
}

class VerticalTimeline {
    constructor(tracker) {
        this.tracker = tracker;
        this.container = document.getElementById('vertical-timeline');
    }

    render() {
        this.container.innerHTML = '';
        let currentGroup = null;
        let groupOneColumn = document.createElement('div');
        let groupTwoColumn = document.createElement('div');
        groupOneColumn.className = 'timeline-column group-one';
        groupTwoColumn.className = 'timeline-column group-two';

        this.tracker.eventLog.forEach((event, index) => {
            const eventElement = this.createEventElement(event, index);
            if (event.action === 'Group split') {
                currentGroup = 'split';
                this.container.appendChild(groupOneColumn);
                this.container.appendChild(groupTwoColumn);
            } else if (event.action === 'Groups reunited') {
                currentGroup = null;
                this.container.appendChild(groupOneColumn);
                this.container.appendChild(groupTwoColumn);
                groupOneColumn = document.createElement('div');
                groupTwoColumn = document.createElement('div');
                groupOneColumn.className = 'timeline-column group-one';
                groupTwoColumn.className = 'timeline-column group-two';
            }

            if (currentGroup === 'split') {
                if (event.group === 'Group One') {
                    groupOneColumn.appendChild(eventElement);
                } else {
                    groupTwoColumn.appendChild(eventElement);
                }
            } else {
                this.container.appendChild(eventElement);
            }
        });

        // Append any remaining events after the last split/reunite
        if (currentGroup === 'split') {
            this.container.appendChild(groupOneColumn);
            this.container.appendChild(groupTwoColumn);
        }
    }

    createEventElement(event, index) {
        const eventElement = document.createElement('div');
        eventElement.className = `timeline-event ${event.group.toLowerCase().replace(' ', '-')}`;
        eventElement.innerHTML = `
            <div class="timeline-icon">${this.getEventIcon(event.action)}</div>
            <div class="timeline-content">
                <h3>${this.formatTime(event.time)}</h3>
                <p>${event.action}</p>
            </div>
        `;
        return eventElement;
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    getEventIcon(action) {
        const icons = {
            'Entered a new floor': '🏠',
            'Searched a room': '🔍',
            'Took a short rest': '😴',
            'Completed a combat round': '⚔️',
            'Performed ritual casting': '📜',
            'Took 20 on a check': '🎯',
            'Custom time added': '⏱️',
            'Group split': '👥',
            'Groups reunited': '🤝'
        };
        return icons[action] || '❓';
    }

    addEvent(event) {
        this.render(); // Re-render the entire timeline for simplicity
    }

    toggleGroupSplit(isSplit) {
        this.render(); // Re-render to reflect the split or reunited state
    }
}

// Initialize the tracker when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const tracker = new DeathHouseTracker();
});
