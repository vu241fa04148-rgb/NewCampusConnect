const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const { allClaims, reviewClaim } = require("../controllers/claimController");
const Item = require("../models/Item");
const User = require("../models/User");

router.use(protect, adminOnly);
router.get("/claims", allClaims);
router.get("/items", async (req, res) => {
  try {
    const items = await Item.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: "Could not load all items." });
  }
});
router.put("/claims/:id", reviewClaim);
router.get("/stats", async (req, res) => {
  try {
    const [users, items, claims, pending, approved, rejected, successful] = await Promise.all([
      User.countDocuments(), Item.countDocuments(), require("../models/Claim").countDocuments(),
      require("../models/Claim").countDocuments({ status: "pending" }),
      require("../models/Claim").countDocuments({ status: "approved" }),
      require("../models/Claim").countDocuments({ status: "rejected" }),
      require("../models/Claim").countDocuments({ status: "successful" })
    ]);
    res.json({ users, items, claims, pending, approved, rejected, successful });
  } catch (error) {
    res.status(500).json({ message: "Could not load dashboard statistics." });
  }
});
router.delete("/items/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found." });
    const Claim = require("../models/Claim");
    const activeClaim = await Claim.exists({ item: item._id, status: "approved" });
    if (activeClaim) return res.status(409).json({ message: "Resolve the approved claim before deleting this item." });
    await Claim.deleteMany({ item: item._id });
    await item.deleteOne();
    res.json({ message: "Item and related claims deleted." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete item." });
  }
});
router.delete("/users/:id", async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "You cannot delete your own admin account." });
    const Claim = require("../models/Claim");
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target.role === "admin") return res.status(403).json({ message: "Admin accounts cannot be deleted here." });
    const ownedItems = await Item.find({ user: target._id }).select("_id");
    const itemIds = ownedItems.map(x => x._id);
    await Claim.deleteMany({ $or: [{ claimant: target._id }, { item: { $in: itemIds } }] });
    await Item.deleteMany({ user: target._id });
    await require("../models/Notification").deleteMany({ user: target._id });
    await target.deleteOne();
    res.json({ message: "Student account and related records deleted." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete user." });
  }
});
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("name email role createdAt").sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Could not load users." });
  }
});
module.exports = router;
