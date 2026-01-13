const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { db, init } = require("./db");

const app = express();
const port = process.env.PORT || 3010;
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({ storage });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

const owners = ["Ellie", "Johnny"];

const pickOwner = (value) => (owners.includes(value) ? value : "Ellie");

const getSettings = () =>
  new Promise((resolve, reject) => {
    db.all("SELECT key, value FROM settings", (err, rows) => {
      if (err) return reject(err);
      const settings = rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      resolve(settings);
    });
  });

const setSetting = (key, value) =>
  new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
      (err) => (err ? reject(err) : resolve())
    );
  });

const fetchRows = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });

const deletePostFile = (filePath) => {
  if (!filePath) return;
  const fileName = path.basename(filePath);
  const absolutePath = path.join(uploadDir, fileName);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const buildCalendar = (monthKey) => {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const weeks = [];
  let day = 1;

  for (let row = 0; row < 6; row += 1) {
    const week = [];
    for (let col = 0; col < 7; col += 1) {
      if ((row === 0 && col < startOffset) || day > totalDays) {
        week.push(null);
      } else {
        const date = new Date(year, month, day);
        const dateKey = date.toISOString().slice(0, 10);
        week.push({ day, dateKey });
        day += 1;
      }
    }
    weeks.push(week);
  }

  return weeks;
};

const getYouTubeEmbed = (url) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

app.get("/", async (req, res) => {
  try {
    const settings = await getSettings();
    const travelStart = settings.travel_start || "2026-11-01";
    const travelEnd = settings.travel_end || "2026-11-30";

    const selectedMonth = req.query.month || travelStart.slice(0, 7);

    const posts = await fetchRows(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    const tasks = await fetchRows(
      "SELECT * FROM tasks ORDER BY created_at DESC"
    );
    const items = await fetchRows(
      "SELECT * FROM items ORDER BY created_at DESC"
    );
    const itinerary = await fetchRows(
      "SELECT * FROM itinerary WHERE date LIKE ? ORDER BY date ASC",
      [`${selectedMonth}%`]
    );

    const calendar = buildCalendar(selectedMonth);
    const itineraryByDate = itinerary.reduce((acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    }, {});

    res.render("index", {
      posts,
      tasks,
      items,
      itinerary,
      itineraryByDate,
      travelStart,
      travelEnd,
      selectedMonth,
      calendar,
      owners,
      getYouTubeEmbed,
    });
  } catch (error) {
    res.status(500).send("Unable to load dashboard.");
  }
});

app.post("/settings/travel-dates", async (req, res) => {
  const start = req.body.travel_start || "2026-11-01";
  const end = req.body.travel_end || "2026-11-30";
  try {
    await setSetting("travel_start", start);
    await setSetting("travel_end", end);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to save travel dates.");
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/posts", upload.single("file"), async (req, res) => {
  const { kind, title, content, url, owner } = req.body;
  const filePath = req.file ? `uploads/${req.file.filename}` : null;
  const safeKind = kind === "link" ? "link" : "note";
  const safeOwner = pickOwner(owner);

  try {
    await runQuery(
      `INSERT INTO posts (kind, title, content, url, file_path, owner, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [safeKind, title || null, content || null, url || null, filePath, safeOwner]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to save post.");
  }
});

app.post("/posts/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await fetchRows("SELECT file_path FROM posts WHERE id = ?", [
      id,
    ]);
    if (rows[0]?.file_path) {
      deletePostFile(rows[0].file_path);
    }
    await runQuery("DELETE FROM posts WHERE id = ?", [id]);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to delete post.");
  }
});

app.post("/posts/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { kind, title, content, url } = req.body;
  const safeKind = kind === "link" ? "link" : "note";

  try {
    await runQuery(
      `UPDATE posts
       SET kind = ?, title = ?, content = ?, url = ?
       WHERE id = ?`,
      [safeKind, title || null, content || null, url || null, id]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to update post.");
  }
});

app.post("/tasks", async (req, res) => {
  const { category, text, owner } = req.body;
  if (!text) return res.redirect("/");
  const safeOwner = pickOwner(owner);
  const safeCategory = category === "during" ? "during" : "before";

  try {
    await runQuery(
      `INSERT INTO tasks (category, text, owner, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [safeCategory, text, safeOwner]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to save task.");
  }
});

app.post("/tasks/:id/toggle", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery(
      "UPDATE tasks SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END WHERE id = ?",
      [id]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to update task.");
  }
});

app.post("/tasks/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery("DELETE FROM tasks WHERE id = ?", [id]);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to delete task.");
  }
});

app.post("/tasks/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { category, text } = req.body;
  if (!text) return res.redirect("/");
  const safeCategory = category === "during" ? "during" : "before";

  try {
    await runQuery(
      "UPDATE tasks SET category = ?, text = ? WHERE id = ?",
      [safeCategory, text, id]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to update task.");
  }
});

app.post("/items", async (req, res) => {
  const { list, name, owner } = req.body;
  if (!name) return res.redirect("/");
  const safeOwner = pickOwner(owner);
  const safeList = list === "buy-in-japan" ? "buy-in-japan" : "before-travel";

  try {
    await runQuery(
      `INSERT INTO items (list, name, owner, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [safeList, name, safeOwner]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to save item.");
  }
});

app.post("/items/:id/toggle", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery(
      "UPDATE items SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END WHERE id = ?",
      [id]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to update item.");
  }
});

app.post("/items/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery("DELETE FROM items WHERE id = ?", [id]);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to delete item.");
  }
});

app.post("/items/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { list, name } = req.body;
  if (!name) return res.redirect("/");
  const safeList = list === "buy-in-japan" ? "buy-in-japan" : "before-travel";

  try {
    await runQuery("UPDATE items SET list = ?, name = ? WHERE id = ?", [
      safeList,
      name,
      id,
    ]);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to update item.");
  }
});

app.post("/itinerary", async (req, res) => {
  const { date, description, owner } = req.body;
  if (!date || !description) return res.redirect("/");
  const safeOwner = pickOwner(owner);

  try {
    await runQuery(
      `INSERT INTO itinerary (date, description, owner, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [date, description, safeOwner]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to save itinerary item.");
  }
});

app.post("/itinerary/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { date, description } = req.body;
  if (!date || !description) return res.redirect("/");

  try {
    await runQuery(
      "UPDATE itinerary SET date = ?, description = ? WHERE id = ?",
      [date, description, id]
    );
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to update itinerary item.");
  }
});

app.post("/itinerary/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery("DELETE FROM itinerary WHERE id = ?", [id]);
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Unable to delete itinerary item.");
  }
});

init();

app.listen(port, () => {
  console.log(`Japan Trip Dashboard running on port ${port}`);
});
