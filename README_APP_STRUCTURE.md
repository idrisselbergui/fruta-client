# Fruta App Structure

## High-Level Explanation

The Fruta app is a web application designed to manage and track fruit-related data. It provides a dashboard to visualize data, manage programs, and handle treatments. The app features user authentication, role-based access control, and data visualization through charts and graphs.

## Folder/File Structure

```
.
├── public/
│   ├── diaf.png
│   ├── frutaaaaa.png
│   ├── image_0345f3.jpg
│   └── vite.svg
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── CollapsibleCard.jsx
│   │   ├── DashboardChart.jsx
│   │   ├── EcartDirectModal.css
│   │   ├── EcartDirectModal.jsx
│   │   ├── Footer.css
│   │   ├── Footer.jsx
│   │   ├── Header.css
│   │   ├── Header.jsx
│   │   ├── Layout.css
│   │   ├── Layout.jsx
│   │   ├── LoadingSpinner.css
│   │   ├── LoadingSpinner.jsx
│   │   ├── ProgramDetails.jsx
│   │   ├── ProgramHeader.jsx
│   │   ├── Sidebar.css
│   │   ├── Sidebar.jsx
│   │   ├── StackedBarChart.css
│   │   ├── StackedBarChart.jsx
│   │   └── TrendChart.jsx
│   ├── hooks/
│   │   └── useDebounce.js
│   ├── pages/
│   │   ├── AdminPage.jsx
│   │   ├── DailyProgram.css
│   │   ├── DailyProgramPage.jsx
│   │   ├── DashboardPage.css
│   │   ├── DashboardPage.jsx
│   │   ├── EcartDirectPage.css
│   │   ├── EcartDirectPage.jsx
│   │   ├── HomePage.css
│   │   ├── HomePage.jsx
│   │   ├── ProgramListPage.jsx
│   │   ├── TraitementPage.css
│   │   ├── TraitementPage.jsx
│   │   ├── TraitPage.css
│   │   └── TraitPage.jsx
│   ├── utils/
│   │   ├── chartPdfGenerator.js
│   │   ├── numberUtils.js
│   │   └── pdfGenerator.js
│   ├── apiService.js
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   ├── LoginForm.css
│   ├── LoginForm.jsx
│   ├── main.jsx
│   ├── ProtectedRoute.jsx
│   └── RegisterForm.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── vercel.json
└── vite.config.js
```

## Main Pages and Components

### `App.jsx`

- **Responsibility:** The main component of the app, responsible for routing and rendering the correct pages based on the URL.
- **Functions:**
  - `App()`: The main functional component that sets up the routing for the application.
- **Data Flow:**
  - It uses `react-router-dom` to handle routing.
  - It renders the `Layout` component, which provides the basic structure for all pages.
  - It defines the routes for the `HomePage`, `LoginForm`, `RegisterForm`, `DashboardPage`, `AdminPage`, `ProgramListPage`, `DailyProgramPage`, `TraitementPage`, and `EcartDirectPage`.
- **Key Libraries:** `react-router-dom`.

### `LoginForm.jsx`

- **Responsibility:** Provides a form for users to log in to the application.
- **Functions:**
  - `LoginForm()`: The main functional component that renders the login form.
  - `handleSubmit()`: Handles the form submission, sends a request to the API to authenticate the user, and stores the token in local storage.
- **Data Flow:**
  - It uses the `useState` hook to manage the form state.
  - It makes an API call to the backend to authenticate the user.
  - Upon successful login, it navigates the user to the dashboard.
- **Key Libraries:** `axios`.

### `DashboardPage.jsx`

- **Responsibility:** Displays the main dashboard with charts and data visualizations.
- **Functions:**
  - `DashboardPage()`: The main functional component that fetches and displays the dashboard data.
- **Data Flow:**
  - It fetches data from the API to populate the charts.
  - It uses the `DashboardChart`, `StackedBarChart`, and `TrendChart` components to display the data.
- **Key Libraries:** `chart.js`, `react-chartjs-2`.

### `Layout.jsx`

- **Responsibility:** Provides the basic layout for all pages, including the header, sidebar, and footer.
- **Functions:**
  - `Layout()`: The main functional component that renders the layout.
- **Data Flow:**
  - It receives the `children` prop, which represents the content of the current page.
  - It renders the `Header`, `Sidebar`, and `Footer` components.
- **Key Libraries:** `react-router-dom`.

## How the Code Works

The application is a single-page application (SPA) built with React. It uses `react-router-dom` for routing, which allows the app to have multiple pages without reloading the entire page. The main component is `App.jsx`, which sets up the routes for all the pages.

When a user visits the app, they are redirected to the login page. After successful authentication, a JSON Web Token (JWT) is stored in the browser's local storage. This token is used to authenticate subsequent requests to the API.

The `Layout.jsx` component provides the basic structure for all pages, including a header, sidebar, and footer. The `Sidebar.jsx` component contains the navigation links to the different pages of the app.

The `DashboardPage.jsx` is the main page of the app, which displays charts and data visualizations. It fetches data from the API and uses the `chart.js` library to render the charts.

The app also includes pages for managing programs, treatments, and users. These pages use forms to create, read, update, and delete data from the database.
