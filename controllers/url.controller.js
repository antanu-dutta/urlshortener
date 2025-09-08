// ======================= IMPORTS ==========================
import {
  getAllLinks,
  getUrlByShortCode,
  createLink,
  getLinkById,
  findByIdCodeAndUpdate,
  getLinkByIdAndDelete,
} from "../services/url.services.js";
import { shortenerSchema } from "../validators/shortener.validator.js";

const generateCode = (length = 6) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

// ======================= CONTROLLERS ======================

export const getHomePage = async (req, res) => {
  try {
    const links = await getAllLinks(req.user?.userId);
    res.render("index", {
      links,
      protocol: req.protocol,
      title: "Url Shortener",
      host: req.get("host"),
      isLoggedIn: true,
      errors: req.flash("errors"),
    });
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.status(500).send("Error loading homepage");
  }
};

export const getReportPage = (req, res) => {
  res.render("report");
};

export const redirectToOriginal = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const [link] = await getUrlByShortCode(shortCode);

    if (link) {
      let targetUrl = link.url;

      // Ensure the URL has a valid protocol
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "http://" + targetUrl;
      }

      return res.redirect(302, targetUrl);
    }

    res.status(404).send("Shortened URL not found");
  } catch (err) {
    console.error("Error during redirection:", err);
    res.status(500).send("Internal Server Error");
  }
};

export const createShortUrl = async (req, res) => {
  try {
    let { url, shortCode } = req.body;

    if (!shortCode) {
      shortCode = generateCode();
    }

    const { data, error } = shortenerSchema.safeParse({ url, shortCode });

    if (error) {
      req.flash("errors", error.issues?.[0].message);
      return res.redirect("/");
    }

    // Check if custom short code already exists
    const [existingLink] = await getUrlByShortCode(data.shortCode);
    if (existingLink) {
      req.flash("errors", "Short code already exists");
      return res.redirect("/");
    }

    if (!req.user) return res.redirect("/auth/login");
    // Save new short link
    await createLink({
      url: data.url,
      shortCode: data.shortCode,
      userId: req.user.userId,
    });

    // Redirect back to homepage
    res.redirect("/");
  } catch (err) {
    console.error("Error creating short URL:", err);
    res.status(500).send("Failed to create short URL");
  }
};

export const getUpdateLinkPage = async (req, res) => {
  try {
    const { id } = req.params;
    const [link] = await getLinkById(id);
    console.log(link);
    return res.render("edit", {
      title: "Update Url",
      errors: req.flash("errors"),
      link,
    });
  } catch (error) {
    console.error(error);
  }
};

export const updateLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, shortCode } = req.body;
    const { data, error } = shortenerSchema.safeParse({ url, shortCode });
    if (error) {
      req.flash("errors", error.issues?.[0].message);
      return res.redirect(`/edit/${id}`);
    }
    const [link] = await getLinkById(id);
    if (link.shortCode === shortCode) {
      req.flash("errors", "Shortcode already exists, please try another one");
      return res.redirect(`/edit/${link.id}`);
    }
    await findByIdCodeAndUpdate(id, data.shortCode, data.url);
    return res.redirect("/");
  } catch (error) {
    console.error(error.message);
  }
};

export const deleteLink = async (req, res) => {
  try {
    const { id } = req.params;
    const [link] = await getLinkById(id);
    await getLinkByIdAndDelete(link.id);
    return res.redirect("/");
  } catch (error) {
    console.error(error);
  }
};
