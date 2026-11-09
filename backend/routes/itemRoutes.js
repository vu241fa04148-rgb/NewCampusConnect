const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { createItem, getItems, myReports } = require("../controllers/itemController");
router.use(protect);
router.get("/", getItems);
router.get("/mine", myReports);
router.post("/", createItem);
module.exports = router;
