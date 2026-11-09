const Item = require("../models/Item");

exports.createItem = async (req, res) => {
  try {
    const { title, type, category, description, location, date, imageUrl, fullName, phone, email } = req.body;
    if (!title || !["lost", "found"].includes(type) || !description || !location || !date || !fullName || !phone || !email) {
      return res.status(400).json({ message: "Complete item details and founder contact details are required." });
    }
    const item = await Item.create({
      title, type, category, description, location, date, imageUrl,
      founderContact: { fullName, phone, email },
      user: req.user._id
    });
    res.status(201).json({ message: "Item report created.", item });
  } catch (error) {
    console.error("Create item:", error);
    res.status(500).json({ message: "Could not create item. Check all required fields." });
  }
};

exports.getItems = async (req, res) => {
  try {
    const filter = {};
    if (["lost", "found"].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.search) {
      const term = req.query.search.trim();
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { location: { $regex: term, $options: "i" } }
      ];
    }
    filter.status = { $ne: "closed" };
    const items = await Item.find(filter).select("-founderContact")
      .populate("user", "name").sort({ createdAt: -1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: "Could not load items." });
  }
};

exports.myReports = async (req, res) => {
  try {
    const items = await Item.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: "Could not load your reports." });
  }
};
