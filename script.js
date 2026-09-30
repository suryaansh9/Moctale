/* =====================================================
   CINEVAULT
   Vanilla JavaScript Movie Search & Watchlist
   ===================================================== */

/* =====================================================
   1. API CONFIGURATION
   ===================================================== */

// Get your own API key from:
// https://www.omdbapi.com/apikey.aspx

const API_KEY = "YOUR_API_KEY";

const API_URL = "http://www.omdbapi.com/?i=tt3896198&apikey=5a7ad5f0";

/* =====================================================
   2. DOM ELEMENTS
   ===================================================== */

const searchForm = document.getElementById("searchForm");

const searchInput = document.getElementById("searchInput");

const movieGrid = document.getElementById("movieGrid");

const statusMessage = document.getElementById("statusMessage");

const resultsTitle = document.getElementById("resultsTitle");

const typeFilter = document.getElementById("typeFilter");

const sortSelect = document.getElementById("sortSelect");

const homePage = document.getElementById("homePage");

const watchlistPage = document.getElementById("watchlistPage");

const homeBtn = document.getElementById("homeBtn");

const watchlistBtn = document.getElementById("watchlistBtn");

const backHomeBtn = document.getElementById("backHomeBtn");

const discoverBtn = document.getElementById("discoverBtn");

const watchlistGrid = document.getElementById("watchlistGrid");

const emptyWatchlist = document.getElementById("emptyWatchlist");

const watchlistCount = document.getElementById("watchlistCount");

const movieModal = document.getElementById("movieModal");

const modalOverlay = document.getElementById("modalOverlay");

const closeModal = document.getElementById("closeModal");

const movieDetails = document.getElementById("movieDetails");

const themeToggle = document.getElementById("themeToggle");

const toast = document.getElementById("toast");

const logo = document.getElementById("logo");

/* =====================================================
   3. APPLICATION STATE
   ===================================================== */

let currentMovies = [];

let watchlist = getWatchlist();

/* =====================================================
   4. LOCAL STORAGE
   ===================================================== */

function getWatchlist() {
  try {
    const savedMovies = localStorage.getItem("cinevaultWatchlist");

    return savedMovies ? JSON.parse(savedMovies) : [];
  } catch (error) {
    console.error("Could not read watchlist:", error);

    return [];
  }
}

function saveWatchlist() {
  localStorage.setItem("cinevaultWatchlist", JSON.stringify(watchlist));

  updateWatchlistCount();
}

//  THEME SYSTEM //

function loadTheme() {
  const savedTheme = localStorage.getItem("cinevaultTheme");

  if (savedTheme === "light") {
    document.body.classList.add("light-theme");

    themeToggle.textContent = "🌙";
  } else {
    document.body.classList.remove("light-theme");

    themeToggle.textContent = "☀️";
  }
}

function toggleTheme() {
  document.body.classList.toggle("light-theme");

  const isLight = document.body.classList.contains("light-theme");

  localStorage.setItem("cinevaultTheme", isLight ? "light" : "dark");

  themeToggle.textContent = isLight ? "🌙" : "☀️";
}

/* =====================================================
   6. API FUNCTIONS
   ===================================================== */

function createApiUrl(parameters) {
  const url = new URL(API_URL);

  url.searchParams.set("apikey", API_KEY);

  Object.entries(parameters).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

async function searchMovies(query) {
  if (!API_KEY || API_KEY === "YOUR_API_KEY") {
    showError(
      "API key missing",
      "Please add your OMDb API key in script.js before searching.",
    );

    return;
  }

  showLoading();

  try {
    const url = createApiUrl({
      s: query,

      type: typeFilter.value === "all" ? "" : typeFilter.value,

      page: 1,
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Network response was not successful.");
    }

    const data = await response.json();

    if (data.Response === "False") {
      showError(
        "No movies found",
        data.Error || "Try searching for another movie.",
      );

      return;
    }

    currentMovies = data.Search || [];

    /*
     * OMDb search results normally contain
     * IMDb ID, title, year, type and poster.
     *
     * Rating is not normally included in the
     * search response, so fetch detailed data
     * for each movie to obtain IMDb rating.
     */

    const detailedMovies = await getMovieRatings(currentMovies);

    currentMovies = detailedMovies;

    resultsTitle.textContent = `Search Results for "${query}"`;

    applyFiltersAndSort();
  } catch (error) {
    console.error("Search error:", error);

    showError(
      "Something went wrong",
      "Unable to connect to the movie service. Please try again.",
    );
  }
}

async function getMovieRatings(movies) {
  const moviePromises = movies.map(async (movie) => {
    try {
      const url = createApiUrl({
        i: movie.imdbID,
      });

      const response = await fetch(url);

      const data = await response.json();

      return {
        ...movie,

        imdbRating: data.imdbRating || "N/A",
      };
    } catch (error) {
      return {
        ...movie,

        imdbRating: "N/A",
      };
    }
  });

  return await Promise.all(moviePromises);
}

async function getMovieDetails(imdbID) {
  showDetailsLoading();

  try {
    const url = createApiUrl({
      i: imdbID,

      plot: "full",
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not fetch movie details.");
    }

    const data = await response.json();

    if (data.Response === "False") {
      throw new Error(data.Error);
    }

    renderMovieDetails(data);
  } catch (error) {
    console.error("Details error:", error);

    movieDetails.innerHTML = `

            <div class="error-state">

                <div class="error-icon">
                    ⚠️
                </div>

                <h3>
                    Could not load movie details
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>
        `;
  }
}

/* =====================================================
   7. SEARCH UI
   ===================================================== */

function showLoading() {
  movieGrid.innerHTML = "";

  statusMessage.classList.remove("hidden");

  statusMessage.innerHTML = `

        <div class="loader"></div>

        <p>
            Searching for movies...
        </p>
    `;
}

function hideLoading() {
  statusMessage.classList.add("hidden");
}

function showError(title, message) {
  hideLoading();

  movieGrid.innerHTML = `

        <div class="error-state">

            <div class="error-icon">
                🎬
            </div>

            <h3>
                ${escapeHtml(title)}
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
    `;
}

/* =====================================================
   8. MOVIE CARD RENDERING
   ===================================================== */

function renderMovies(movies) {
  hideLoading();

  if (!movies.length) {
    movieGrid.innerHTML = `

            <div class="error-state">

                <div class="error-icon">
                    🔎
                </div>

                <h3>
                    No matching movies
                </h3>

                <p>
                    Try changing your search or filters.
                </p>

            </div>
        `;

    return;
  }

  movieGrid.innerHTML = movies.map(createMovieCard).join("");
}

function createMovieCard(movie) {
  const saved = isMovieInWatchlist(movie.imdbID);

  const poster =
    movie.Poster && movie.Poster !== "N/A"
      ? `
                <img
                    src="${escapeAttribute(movie.Poster)}"
                    alt="${escapeAttribute(movie.Title)} poster"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
              `
      : `
                <div class="poster-placeholder">
                    🎬
                </div>
              `;

  const rating =
    movie.imdbRating && movie.imdbRating !== "N/A"
      ? `⭐ ${movie.imdbRating}`
      : "⭐ N/A";

  return `

        <article class="movie-card">

            <div class="poster-container">

                ${poster}

                <span class="rating-badge">
                    ${escapeHtml(rating)}
                </span>

            </div>


            <div class="movie-info">

                <h3
                    class="movie-title"
                    title="${escapeAttribute(movie.Title)}"
                >
                    ${escapeHtml(movie.Title)}
                </h3>


                <div class="movie-meta">

                    <span>
                        ${escapeHtml(movie.Year)}
                    </span>

                    <span>
                        ${escapeHtml(movie.Type)}
                    </span>

                </div>


                <div class="card-actions">

                    <button
                        class="details-btn"
                        data-action="details"
                        data-id="${escapeAttribute(movie.imdbID)}"
                    >
                        View Details
                    </button>


                    <button
                        class="watchlist-btn ${saved ? "saved" : ""}"
                        data-action="watchlist"
                        data-id="${escapeAttribute(movie.imdbID)}"
                    >
                        ${saved ? "✓ In Watchlist" : "+ Add to Watchlist"}
                    </button>

                </div>

            </div>

        </article>
    `;
}

/* =====================================================
   9. FILTERING & SORTING
   ===================================================== */

function applyFiltersAndSort() {
  let movies = [...currentMovies];

  /*
   * Type filter
   */

  if (typeFilter.value !== "all") {
    movies = movies.filter((movie) => movie.Type === typeFilter.value);
  }

  /*
   * Sorting
   */

  switch (sortSelect.value) {
    case "title":
      movies.sort((a, b) => a.Title.localeCompare(b.Title));

      break;

    case "year":
      movies.sort((a, b) => getYear(b.Year) - getYear(a.Year));

      break;

    case "rating":
      movies.sort((a, b) => getRating(b.imdbRating) - getRating(a.imdbRating));

      break;

    default:
      break;
  }

  renderMovies(movies);
}

function getYear(year) {
  const match = String(year).match(/\d{4}/);

  return match ? Number(match[0]) : 0;
}

function getRating(rating) {
  const number = parseFloat(rating);

  return Number.isNaN(number) ? 0 : number;
}

/* =====================================================
   10. WATCHLIST FUNCTIONS
   ===================================================== */

function isMovieInWatchlist(imdbID) {
  return watchlist.some((movie) => movie.imdbID === imdbID);
}

async function toggleWatchlist(imdbID) {
  const existingIndex = watchlist.findIndex((movie) => movie.imdbID === imdbID);

  /*
   * Remove movie if already saved.
   */

  if (existingIndex !== -1) {
    const removedMovie = watchlist.splice(existingIndex, 1)[0];

    saveWatchlist();

    showToast(`"${removedMovie.Title}" removed from watchlist.`);

    refreshCurrentView();

    return;
  }

  /*
   * Movie isn't saved.
   * Fetch complete movie data before saving.
   */

  try {
    const url = createApiUrl({
      i: imdbID,
    });

    const response = await fetch(url);

    const movie = await response.json();

    if (movie.Response === "False") {
      throw new Error(movie.Error);
    }

    /*
     * Extra duplicate protection.
     */

    if (!isMovieInWatchlist(movie.imdbID)) {
      watchlist.push(movie);

      saveWatchlist();

      showToast(`"${movie.Title}" added to watchlist.`);
    }

    refreshCurrentView();
  } catch (error) {
    console.error(error);

    showToast("Could not update watchlist.");
  }
}

function updateWatchlistCount() {
  watchlistCount.textContent = watchlist.length;
}

function renderWatchlist() {
  updateWatchlistCount();

  if (!watchlist.length) {
    watchlistGrid.innerHTML = "";

    emptyWatchlist.classList.remove("hidden");

    return;
  }

  emptyWatchlist.classList.add("hidden");

  watchlistGrid.innerHTML = watchlist.map(createMovieCard).join("");
}

/* =====================================================
   11. MOVIE DETAILS
   ===================================================== */

function openMovieDetails(imdbID) {
  movieModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  getMovieDetails(imdbID);
}

function closeMovieDetails() {
  movieModal.classList.add("hidden");

  document.body.style.overflow = "";
}

function showDetailsLoading() {
  movieDetails.innerHTML = `

        <div class="details-loading">

            <div class="loader"></div>

            <p>
                Loading movie details...
            </p>

        </div>
    `;
}

function renderMovieDetails(movie) {
  const poster =
    movie.Poster && movie.Poster !== "N/A"
      ? `
                <img
                    class="details-poster"
                    src="${escapeAttribute(movie.Poster)}"
                    alt="${escapeAttribute(movie.Title)} poster"
                >
              `
      : `
                <div class="poster-placeholder">
                    🎬
                </div>
              `;

  const saved = isMovieInWatchlist(movie.imdbID);

  movieDetails.innerHTML = `

        <div class="movie-details">

            <div>
                ${poster}
            </div>


            <div class="details-content">

                <p class="section-label">
                    MOVIE DETAILS
                </p>


                <h2>
                    ${escapeHtml(movie.Title)}
                </h2>


                <div class="details-meta">

                    <span class="details-tag">
                        ${escapeHtml(movie.Year)}
                    </span>

                    <span class="details-tag">
                        ${escapeHtml(movie.Rated)}
                    </span>

                    <span class="details-tag">
                        ${escapeHtml(movie.Runtime)}
                    </span>

                    <span class="details-tag">
                        ⭐ ${escapeHtml(movie.imdbRating)}
                    </span>

                </div>


                <h3>
                    Genre
                </h3>

                <p>
                    ${escapeHtml(movie.Genre)}
                </p>


                <h3>
                    Plot
                </h3>

                <p>
                    ${escapeHtml(movie.Plot)}
                </p>


                <h3>
                    Director
                </h3>

                <p>
                    ${escapeHtml(movie.Director)}
                </p>


                <h3>
                    Actors
                </h3>

                <p>
                    ${escapeHtml(movie.Actors)}
                </p>


                <h3>
                    Language
                </h3>

                <p>
                    ${escapeHtml(movie.Language)}
                </p>


                <h3>
                    Country
                </h3>

                <p>
                    ${escapeHtml(movie.Country)}
                </p>


                <h3>
                    Release Date
                </h3>

                <p>
                    ${escapeHtml(movie.Released)}
                </p>


                <h3>
                    IMDb ID
                </h3>

                <p>
                    ${escapeHtml(movie.imdbID)}
                </p>


                <button
                    class="primary-btn details-watchlist"
                    id="detailsWatchlistBtn"
                    data-id="${escapeAttribute(movie.imdbID)}"
                >
                    ${saved ? "✓ Remove from Watchlist" : "+ Add to Watchlist"}
                </button>

            </div>

        </div>
    `;

  const detailsButton = document.getElementById("detailsWatchlistBtn");

  detailsButton.addEventListener("click", async () => {
    await toggleWatchlist(movie.imdbID);

    /*
     * Re-render details button
     * so its state changes immediately.
     */

    renderMovieDetails(movie);
  });
}

/* =====================================================
   12. PAGE NAVIGATION
   ===================================================== */

function showHomePage() {
  homePage.classList.remove("hidden");

  watchlistPage.classList.add("hidden");

  homeBtn.classList.add("active");

  watchlistBtn.classList.remove("active");
}

function showWatchlistPage() {
  homePage.classList.add("hidden");

  watchlistPage.classList.remove("hidden");

  homeBtn.classList.remove("active");

  watchlistBtn.classList.add("active");

  renderWatchlist();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/* =====================================================
   13. REFRESH CURRENT VIEW
   ===================================================== */

function refreshCurrentView() {
  updateWatchlistCount();

  if (!watchlistPage.classList.contains("hidden")) {
    renderWatchlist();
  } else {
    applyFiltersAndSort();
  }
}

/* =====================================================
   14. TOAST MESSAGE
   ===================================================== */

let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);

  toast.textContent = message;

  toast.classList.add("show");

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =====================================================
   15. SECURITY / HTML HELPERS
   ===================================================== */

/*
 * These functions make dynamically inserted
 * text safer before putting it inside HTML.
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

/* =====================================================
   16. EVENT LISTENERS
   ===================================================== */

/*
 * Search form
 *
 * Works for both:
 * - Search button
 * - Enter key
 */

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (!query) {
    showError(
      "Search something first",
      "Enter a movie name in the search box.",
    );

    return;
  }

  searchMovies(query);
});

/*
 * Sorting
 */

sortSelect.addEventListener("change", applyFiltersAndSort);

/*
 * Type filtering
 */

typeFilter.addEventListener("change", () => {
  /*
   * Re-run the search when changing type.
   */

  const query = searchInput.value.trim();

  if (query) {
    searchMovies(query);
  }
});

/*
 * Movie card actions
 *
 * Event delegation means we only need
 * one event listener for the whole grid.
 */

movieGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  const imdbID = button.dataset.id;

  if (action === "details") {
    openMovieDetails(imdbID);
  }

  if (action === "watchlist") {
    toggleWatchlist(imdbID);
  }
});

/*
 * Watchlist grid actions
 */

watchlistGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  const imdbID = button.dataset.id;

  if (action === "details") {
    openMovieDetails(imdbID);
  }

  if (action === "watchlist") {
    toggleWatchlist(imdbID);
  }
});

/*
 * Navigation
 */

homeBtn.addEventListener("click", showHomePage);

watchlistBtn.addEventListener("click", showWatchlistPage);

backHomeBtn.addEventListener("click", showHomePage);

discoverBtn.addEventListener("click", showHomePage);

logo.addEventListener("click", (event) => {
  event.preventDefault();

  showHomePage();
});

/*
 * Theme
 */

themeToggle.addEventListener("click", toggleTheme);

/*
 * Modal
 */

closeModal.addEventListener("click", closeMovieDetails);

modalOverlay.addEventListener("click", closeMovieDetails);

/*
 * ESC key closes modal
 */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !movieModal.classList.contains("hidden")) {
    closeMovieDetails();
  }
});

/* =====================================================
   17. INITIALIZATION
   ===================================================== */

function initializeApp() {
  loadTheme();

  updateWatchlistCount();

  showHomePage();

  /*
   * We don't automatically call the API here.
   *
   * The user can search for any movie after
   * entering their OMDb API key.
   */

  movieGrid.innerHTML = `

        <div class="error-state">

            <div class="error-icon">
                🍿
            </div>

            <h3>
                Search for a movie
            </h3>

            <p>
                Enter a movie name above to discover movies.
            </p>

        </div>
    `;
}

initializeApp();
