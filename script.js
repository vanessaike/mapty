"use strict";

// CLASSES
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    this.description = `${this.icon} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  icon = `<i class="fas fa-running" aria-hidden="true"></i>`;

  constructor(coords, distance, duration) {
    super(coords, distance, duration);
    this._setDescription();
  }
}

class Cycling extends Workout {
  type = "cycling";
  icon = `<i class="fas fa-biking" aria-hidden="true"></i>`;

  constructor(coords, distance, duration) {
    super(coords, distance, duration);
    this._setDescription();
  }
}

////////////////////////////////////

// SELECTING ELEMENTS
const overlay = document.querySelector(".overlay");
// sidebar
const sidebar = document.querySelector(".sidebar");
const btnOpenSidebar = document.querySelector(".btn--open-sidebar");
// modal
const modal = document.querySelector(".modal");
// workouts and form
const containerWorkouts = document.querySelector(".workouts");
const form = document.querySelector(".form");
const inputType = document.querySelector(".form__input--type");
const inputDuration = document.querySelector(".form__input--duration");
const inputDistance = document.querySelector(".form__input--distance");
const btnSaveWorkout = document.querySelector(".btn--save-workout");
const btnDeleteAllWorkouts = document.querySelector(".btn--reset");

// APP
class App {
  _map;
  _mapEvent;
  _mapZoomLevel = 13;
  _mediaQuery = window.matchMedia("(max-width: 900px)");
  _mapMarkers = [];
  _workouts = [];

  constructor() {
    // sidebar responsiveness
    this._responsiveSidebar(this._mediaQuery);
    this._mediaQuery.addEventListener("change", this._responsiveSidebar);

    // get user's position
    this._getPosition();

    // attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    containerWorkouts.addEventListener("click", this._deleteWorkout.bind(this));
    btnDeleteAllWorkouts.addEventListener("click", this._deleteAllWorkouts.bind(this));

    btnOpenSidebar.addEventListener("click", this._openSidebar);
    overlay.addEventListener("click", this._closeSidebar.bind(this));
    overlay.addEventListener("click", this._closeModal);
  }

  _getPosition() {
    // geolocation API (checking if it exists in order to avoid errors in older browsers)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert("Could not get current position :(");
      });
    }
  }

  _loadMap(position) {
    const {latitude} = position.coords;
    const {longitude} = position.coords;
    const coords = [latitude, longitude];

    // leaflet library
    // map
    this._map = L.map("map", {
      zoomControl: false,
    }).setView(coords, this._mapZoomLevel);
    // positioning zoom control buttons
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(this._map);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this._map);

    // show modal when we click the map
    this._map.on("click", this._openModal.bind(this));
  }

  _newWorkout(e) {
    e.preventDefault();
    // inputs validation
    const validInputs = (...inputs) => inputs.every((input) => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every((input) => input > 0);

    // form's data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const {lat, lng} = this._mapEvent.latlng;
    let workout;

    // running
    if (type === "running") {
      if (!validInputs(distance, duration) || !allPositive(distance, duration)) return alert("Invalid inputs!");
      workout = new Running([lat, lng], distance, duration);
    }

    // cycling
    if (type === "cycling") {
      if (!validInputs(distance, duration) || !allPositive(distance, duration)) return alert("invalid inputs!");
      workout = new Cycling([lat, lng], distance, duration);
    }

    // add object to workouts array
    this._workouts.push(workout);

    // render marker
    this._renderMarker(workout);

    // render workout on the sidebar
    this._renderWorkout(workout);

    // close window
    this._closeModal();

    // clear input fields
    inputDistance.value = inputDuration.value = "";
  }

  _renderMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this._map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(workout.description)
      .openPopup();

    this._mapMarkers.push(marker);
  }

  _renderWorkout(workout) {
    const html = `
    <li class="workout workout--cycling" data-id="${workout.id}">
      <div class="workout__header">
          <div class="workout__title" aria-label="${workout.type}">${workout.description}</div>
          <button class="btn btn--delete-workout" aria-label="Delete workout"><i class="far fa-times-circle" aria-hidden="true"></i></button>
      </div>
      <div class="workout__row">
        <div class="workout__details">
          <span class="workout__icon"><i class="fas fa-stopwatch" aria-hidden="true"></i></span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon"><i class="fas fa-bolt" aria-hidden="true"></i></span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
      </div>
    </li>
    `;

    containerWorkouts.insertAdjacentHTML("afterbegin", html);
  }

  _moveToPopup(e) {
    // clicked element that has the closest parent being the workout container
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    // find the object that matches the one we clicked
    const workout = this._workouts.find((workout) => workout.id === workoutEl.dataset.id);

    // take the coordinates from the element and then move to that position
    this._map.setView(workout.coords, this._mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _deleteWorkout(e) {
    // selecting parent
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    // if the element we clicked is the button
    if (e.target.classList.contains("btn--delete-workout")) {
      const workoutIndex = this._workouts.findIndex((workout) => workout.id === workoutEl.dataset.id);
      // deleting marker from UI and from array
      this._map.removeLayer(this._mapMarkers[workoutIndex]);
      this._mapMarkers.splice(workoutIndex, 1);
      // removing the parent from UI and from array
      this._workouts.splice(workoutIndex, 1);
      workoutEl.remove();
    }
  }

  _deleteAllWorkouts() {
    // cleaning the array
    this._workouts.splice(0, this._workouts.length);
    // cleaning workouts
    containerWorkouts.innerHTML = "";
    // removing the markers
    this._mapMarkers.forEach((marker) => this._map.removeLayer(marker));
  }

  _responsiveSidebar(e) {
    // if media query matches
    if (e.matches) {
      // display button
      btnOpenSidebar.classList.remove("hidden");
      // remove sidebar from screen
      sidebar.classList.remove("sidebar--active");
      sidebar.classList.add("hidden");
    } else {
      // initial conditions
      sidebar.classList.add("sidebar--active");
      btnOpenSidebar.classList.add("hidden");
      overlay.classList.add("hidden");
    }
  }

  _openSidebar() {
    sidebar.classList.add("sidebar--active");
    overlay.classList.remove("hidden");
  }

  _closeSidebar() {
    if (sidebar.classList.contains("sidebar--active") && this._mediaQuery.matches) {
      sidebar.classList.remove("sidebar--active");
      overlay.classList.add("hidden");
    }
  }

  _openModal(mapE) {
    // when we click the map we need the coordinates from where we clicked (the event is going to be used to set a new workout)
    this._mapEvent = mapE;
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");
  }

  _closeModal() {
    if (!modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      overlay.classList.add("hidden");
    }
  }
}
const app = new App();
