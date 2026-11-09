const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  createClaim, myClaims, receivedClaims, allClaims, reviewClaim, confirmReturn
} = require("../controllers/claimController");

router.use(protect);
router.post("/", createClaim);
router.get("/mine", myClaims);
router.get("/received", receivedClaims);
router.post("/:id/confirm-return", confirmReturn);
router.get("/all", adminOnly, allClaims);
router.put("/:id/review", adminOnly, reviewClaim);

module.exports = router;
