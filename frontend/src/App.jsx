
import "./App.css";

const categories = [
  { icon: "🏢", title: "Private Jobs", description: "Explore opportunities across industries" },
  { icon: "🏛️", title: "Government Jobs", description: "Find recruitment notices and official links" },
  { icon: "🎓", title: "Fresher Jobs", description: "Start your career with entry-level roles" },
  { icon: "💻", title: "IT & Technology", description: "Discover software and technology jobs" },
];

const jobs = [
  {
    title: "Software Developer",
    company: "Example Technologies",
    location: "Hyderabad, Telangana",
    type: "Full-time",
    category: "Private Sector",
  },
  {
    title: "Graduate Trainee",
    company: "Example Industries",
    location: "Bengaluru, Karnataka",
    type: "Entry-level",
    category: "Private Sector",
  },
  {
    title: "Recruitment Notification",
    company: "Official recruitment source",
    location: "India",
    type: "Check eligibility",
    category: "Government Jobs",
  },
];

function App() {
  return (
    <div className="app">
      <div className="notice">
        UDAAN Careers is an independent job discovery platform, not a government website.
      </div>

      <header className="navbar">
        <a className="brand" href="#" aria-label="UDAAN Careers home">
          <span className="brand-mark">U</span>
          <span>
            <strong>UDAAN Careers</strong>
            <small>Explore. Apply. Grow.</small>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#jobs">Find Jobs</a>
          <a href="#categories">Categories</a>
          <a href="#government">Government Jobs</a>
        </nav>

        <div className="nav-actions">
          <button className="login-button">Log In</button>
          <button className="register-button">Register</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <span className="eyebrow">YOUR CAREER, YOUR FUTURE</span>
          <h1>
            Find opportunities.
            <br />
            <span>Build your future.</span>
          </h1>
          <p>
            Discover private-sector jobs, government recruitment notices,
            and career opportunities from across India.
          </p>

          <form className="search-panel" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>Job title or keyword</span>
              <input placeholder="e.g. Software Developer" />
            </label>
            <label>
              <span>Location</span>
              <input placeholder="e.g. Hyderabad or Remote" />
            </label>
            <button type="submit">Search Jobs</button>
          </form>

          <p className="popular">
            Popular searches: <a href="#jobs">Software Developer</a>
            <a href="#jobs">Internships</a>
            <a href="#government">Government Jobs</a>
          </p>
        </section>

        <section className="section" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE OPPORTUNITIES</span>
              <h2>Find the right path for you</h2>
            </div>
            <p>Explore opportunities that match your career goals.</p>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <article className="category-card" key={category.title}>
                <span className="category-icon">{category.icon}</span>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <a href="#jobs">Explore opportunities →</a>
              </article>
            ))}
          </div>
        </section>

        <section className="section jobs-section" id="jobs">
          <div className="section-heading">
            <div>
              <span className="eyebrow">OPPORTUNITIES TO EXPLORE</span>
              <h2>Featured opportunities</h2>
            </div>
            <a className="view-all" href="#jobs">View all jobs →</a>
          </div>

          <div className="job-grid">
            {jobs.map((job) => (
              <article className="job-card" key={job.title}>
                <span className="job-category">{job.category}</span>
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
                <p className="job-detail">📍 {job.location}</p>
                <p className="job-detail">◷ {job.type}</p>
                <button className="details-button">View details</button>
              </article>
            ))}
          </div>

          <p className="demo-note">
            Demonstration content only. These are not verified live vacancies.
            Government recruitment should be confirmed through the relevant
            official recruiting authority before applying.
          </p>
        </section>

        <section className="government-banner" id="government">
          <div>
            <span className="eyebrow">GOVERNMENT RECRUITMENT</span>
            <h2>Stay informed about public-sector opportunities.</h2>
            <p>
              Explore recruitment notices, eligibility criteria, important dates,
              and links to official application websites.
            </p>
          </div>
          <a
            className="official-link"
            href="https://www.ncs.gov.in/"
            target="_blank"
            rel="noreferrer"
          >
            Visit National Career Service ↗
          </a>
        </section>
      </main>

      <footer className="footer">
        <strong>UDAAN Careers</strong>
        <p>An independent platform for discovering career opportunities in India.</p>
        <small>
          Not affiliated with or endorsed by the Government of India.
        </small>
      </footer>
    </div>
  );
}

export default App;
