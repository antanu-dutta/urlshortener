import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { shortenerLinksTable } from "../drizzle/schema.js";

// ? function for getting all links
export const getAllLinks = async (userId) => {
  try {
    return await db
      .select()
      .from(shortenerLinksTable)
      .where(eq(shortenerLinksTable.userId, userId));
  } catch (error) {
    console.error(error.message);
  }
};

// ? function for  finding link by shortcode
export const getUrlByShortCode = async (shortCode) => {
  try {
    return await db
      .select()
      .from(shortenerLinksTable)
      .where(eq(shortenerLinksTable.shortCode, shortCode));
  } catch (error) {
    console.error(error);
  }
};

// ? function for creating a new link
export const createLink = async (link) => {
  try {
    await db.insert(shortenerLinksTable).values(link);
  } catch (error) {
    console.error(error.message);
  }
};

// ? function for getting a link by id
export const getLinkById = async (id) => {
  try {
    return await db
      .select()
      .from(shortenerLinksTable)
      .where(eq(shortenerLinksTable.id, id));
  } catch (error) {
    console.error(error);
  }
};

// ? function for updating a link with new shortcode by id
export const findByIdCodeAndUpdate = async (id, shortCode, url) => {
  try {
    if (!shortCode) {
      throw new Error("shortCode is required to update");
    }
    if (shortCode === "stack") {
      return "This shortcode is not set";
    }

    await db
      .update(shortenerLinksTable)
      .set({ shortCode, url })
      .where(eq(shortenerLinksTable.id, id));
  } catch (error) {
    console.error("update error:", error.message);
    throw error;
  }
};

export const getLinkByIdAndDelete = async (id) => {
  try {
    await db.delete(shortenerLinksTable).where(eq(shortenerLinksTable.id, id));
  } catch (error) {
    console.error(error.message);
  }
};
