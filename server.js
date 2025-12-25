import express from "express";
import fs from "fs/promises";
import path from "path";

const app = express();
const PORT = 3000;
app.use(express.json());

const __dirname = path.resolve();
const PATH_USERS = path.join(__dirname, "data", "users.json");
const PATH_EVENTS = path.join(__dirname, "data", "events.json");
const PATH_RECEIPTS = path.join(__dirname, "data", "receipts.json");

const readFiles = async (path) => {
  try {
    const data = await fs.readFile(path, "utf8");
    return JSON.parse(data);
  } catch (error) {
    throw error;
  }
};

export async function readUsers() {
  const data = await readFiles(PATH_USERS);
  return data;
}

export async function readEvents() {
  const data = await readFiles(PATH_EVENTS, "utf-8");
  return data;
}

export async function readReceipts() {
  const data = await readFiles(PATH_RECEIPTS, "utf-8");
  return data;
}

const writeFiles = async (data, path) => {
  try {
    await fs.writeFile(path, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    throw error;
  }
};

export async function writeUsers(users) {
  await writeFiles(users, PATH_USERS);
}

export async function writeEvents(events) {
  await writeFiles(events, PATH_EVENTS);
}

export async function writeReceipts(receipts) {
  await writeFiles(receipts, PATH_RECEIPTS);
}

export async function validateUser(username, password) {
  const users = await readUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  return user || null;
}

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);

  next();
});

app.post("/user/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(404).json({ msg: " did not get username or password" });
    }
    const users = await readUsers();
    const userExist = users.find((u) => u.username === username);
    if (userExist) {
      return res.status(400).json({ msg: "user ulredy exsist" });
    }
    const newUser = {
      username,
      password,
    };
    users.push(newUser);
    await writeUsers(users);
    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "error" + err.message, data: null });
  }
});

app.post("/creator/events", async (req, res) => {
  try {
    const { eventName, ticketsForSale, username, password } = req.body;
    const user = await validateUser(username, password);
    if (user === null) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    const events = await readEvents();
    const eventExist = events.find((e) => e.eventName === eventName);
    if (eventExist) {
      return res.status(400).json({ msg: "event ulredy exsist" });
    }
    const newEvent = {
      eventName,
      ticketsForSale: ticketsForSale || 0,
      username,
    };
    events.push(newEvent);
    await writeEvents(events);
    res.status(201).json({ message: "Event created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "error" + err.message, data: null });
  }
});

app.post("/users/tickets/buy", async (req, res) => {
  try {
    const { eventName, username, password, quantity } = req.body;
    const user = await validateUser(username, password);
    if (user === null) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    const events = await readEvents();
    const eventExist = events.find((e) => e.eventName === eventName);
    if (!eventExist) {
      return res.status(400).json({ msg: "event not exist" });
    }
    if (eventExist.ticketsForSale - quantity < 0) {
      return res.status(400).json({ msg: "not eeinoph tikits eveilebol" });
    }
    const receipts = await readReceipts();
    const newReceipt = {
      eventName,
      ticketsBought: quantity,
      username,
    };
    receipts.push(newReceipt);
    await writeReceipts(receipts);
    res.status(201).json({ message: "newReceipt created successfully" });
    eventExist.ticketsForSale = eventExist.ticketsForSale - quantity;
    await writeEvents(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "error" + err.message });
  }
});

app.get("/users/:username/summary", async (req, res) => {
  try {
    const { username } = req.params;
    const receipts = await readReceipts();
    const { body } = req;
    const userReceips = receipts.filter((r) => r.username === username);
    const events = [];
    let totalTikits = 0;
    for (let i = 0; i < userReceips.length; i++) {
      totalTikits += userReceips[i].ticketsBought;
      const eventExist = events.find(
        (eventName) => userReceips[i].eventName === eventName
      );
      if (!eventExist) {
        events.push(userReceips[i].eventName);
      }
    }
    const avg = totalTikits / events.length;
    const sammeri = {
      totalTicketsBought: totalTikits,
      events: events,
      averageTicketsPerEvent: avg,
    };
    res.status(200).json({ data: sammeri });
  } catch (error) {
    res.status(500).json({ msg: "error" + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
