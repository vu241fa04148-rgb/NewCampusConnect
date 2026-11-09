const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Notification = require("../models/Notification");

router.use(protect);
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: "Could not load notifications." });
  }
});
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, { $set: { read: true } }, { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: "Could not update notification." });
  }
});
module.exports = router;
