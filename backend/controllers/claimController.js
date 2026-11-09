const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Notification = require("../models/Notification");

const claimPopulate = [
  { path: "item", populate: { path: "user", select: "name email" } },
  { path: "claimant", select: "name email" },
  { path: "reviewedBy", select: "name email" }
];

exports.createClaim = async (req, res) => {
  try {
    const itemId = req.body.itemId || req.body.item;
    const { proofDescription, fullName, phone, email } = req.body;
    if (!itemId || !proofDescription?.trim() || !fullName?.trim() || !phone?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Item, proof, full name, phone and email are required." });
    }
    const item = await Item.findById(itemId);
    if (!item || item.type !== "found" || item.status !== "active") {
      return res.status(404).json({ message: "This found item is unavailable for claims." });
    }
    if (String(item.user) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot claim your own listing." });
    }
    const existing = await Claim.findOne({
      item: itemId, claimant: req.user._id,
      status: { $in: ["pending", "approved", "successful"] }
    });
    if (existing) return res.status(409).json({ message: "You already have an active or completed claim for this item." });

    const claim = await Claim.create({
      item: itemId,
      claimant: req.user._id,
      proofDescription: proofDescription.trim(),
      claimantContact: { fullName: fullName.trim(), phone: phone.trim(), email: email.trim().toLowerCase() }
    });
    await Notification.create({ user: item.user, message: `A student submitted a claim for "${item.title}".` });
    res.status(201).json({ message: "Claim submitted successfully.", claim });
  } catch (error) {
    console.error("Create claim:", error);
    res.status(500).json({ message: "Could not submit claim." });
  }
};

exports.myClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ claimant: req.user._id })
      .populate({ path: "item", select: "title type category description location date imageUrl status user founderContact", populate: { path: "user", select: "name" } })
      .sort({ createdAt: -1 });
    // Contact details are private; students see only public item and claim information.
    for (const claim of claims) {
      if (claim.item) claim.item.founderContact = undefined;
    }
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ message: "Could not load your claims." });
  }
};

exports.receivedClaims = async (req, res) => {
  try {
    const ownedItems = await Item.find({ user: req.user._id }).distinct("_id");
    const claims = await Claim.find({ item: { $in: ownedItems } })
      .populate({ path: "item" })
      .populate("claimant", "name")
      .sort({ createdAt: -1 });
    for (const claim of claims) {
      claim.claimantContact = undefined;
      if (claim.item) claim.item.founderContact = undefined;
    }
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ message: "Could not load claims on your reports." });
  }
};

exports.allClaims = async (req, res) => {
  try {
    const claims = await Claim.find().populate(claimPopulate).sort({ createdAt: -1 });
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ message: "Could not load all claims." });
  }
};

exports.reviewClaim = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected." });
    }
    const claim = await Claim.findById(req.params.id).populate("item");
    if (!claim) return res.status(404).json({ message: "Claim not found." });
    if (claim.status !== "pending") return res.status(409).json({ message: "Only pending claims can be reviewed." });

    if (status === "approved") {
      const alreadyApproved = await Claim.findOne({
        item: claim.item._id, _id: { $ne: claim._id },
        status: { $in: ["approved", "successful"] }
      });
      if (alreadyApproved || claim.item.status !== "active") {
        return res.status(409).json({ message: "Another claim has already been approved for this item." });
      }
      const reservedItem = await Item.findOneAndUpdate(
        { _id: claim.item._id, status: "active" },
        { $set: { status: "claimed" } },
        { new: true }
      );
      if (!reservedItem) return res.status(409).json({ message: "This item has already been reserved by another approved claim." });
    }
    claim.status = status;
    if (status === "rejected" && claim.item.status === "claimed") {
      const otherApproved = await Claim.exists({
        item: claim.item._id, _id: { $ne: claim._id },
        status: { $in: ["approved", "successful"] }
      });
      if (!otherApproved) {
        await Item.updateOne({ _id: claim.item._id, status: "claimed" }, { $set: { status: "active" } });
      }
    }
    claim.reviewedBy = req.user._id;
    await claim.save();
    await Notification.create({ user: claim.claimant, message: `Your claim for "${claim.item.title}" was ${status}.` });
    res.json({ message: `Claim ${status}.`, claim });
  } catch (error) {
    console.error("Review claim:", error);
    res.status(500).json({ message: "Could not review claim." });
  }
};

exports.confirmReturn = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate("item");
    if (!claim) return res.status(404).json({ message: "Claim not found." });
    if (claim.status !== "approved") return res.status(409).json({ message: "Only approved claims can confirm a return." });

    const isFounder = String(claim.item.user) === String(req.user._id);
    const isClaimant = String(claim.claimant) === String(req.user._id);
    if (!isFounder && !isClaimant) return res.status(403).json({ message: "Only the founder and claimant can confirm this handover." });

    if (isFounder) {
      if (claim.founderReturned) return res.status(409).json({ message: "You have already confirmed the return." });
      claim.founderReturned = true;
      claim.founderConfirmedAt = new Date();
    } else {
      if (claim.claimantReceived) return res.status(409).json({ message: "You have already confirmed receipt." });
      claim.claimantReceived = true;
      claim.claimantConfirmedAt = new Date();
    }

    if (claim.founderReturned && claim.claimantReceived) {
      claim.status = "successful";
      claim.returnedAt = new Date();
      claim.item.status = "returned";
      await claim.item.save();
      await Notification.create({ user: claim.claimant, message: `Successful delivery confirmed for "${claim.item.title}".` });
      await Notification.create({ user: claim.item.user, message: `Successful delivery confirmed for "${claim.item.title}".` });
    }
    await claim.save();
    res.json({
      message: claim.status === "successful" ? "Both confirmations received. Delivery is successful." : "Your confirmation was saved. Waiting for the other person.",
      claim
    });
  } catch (error) {
    console.error("Confirm return:", error);
    if (error.name === "VersionError") return res.status(409).json({ message: "Another confirmation was saved at the same time. Refresh and try again." });
    res.status(500).json({ message: "Could not save return confirmation." });
  }
};
