const countryModel = require("../models/CountryModel");

// Create a new country
const createCountry = async (req, res) => {
  try {
    const countryData = new countryModel(req.body);
    await countryData.save();
    res
      .status(201)
      .json({ data: countryData, message: "Country created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) a country by ID
const getCountryById = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the country and populate the 'universities' field
    const countryData = await countryModel
      .findById(id)
      .populate("universities")
      .lean();
    if (!countryData) {
      return res.status(404).json({ message: "Country not found" });
    }
    res.status(200).json({ data: countryData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Read (Get) all countries
const getAllCountries = async (req, res) => {
  try {
    const countries = await countryModel.find().lean();
    res.status(200).json({ data: countries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a country by ID
const updateCountry = async (req, res) => {
  const id = req.params.id;
  try {
    const countryData = await countryModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();
    if (!countryData) {
      return res.status(404).json({ message: "country not found" });
    }
    res
      .status(200)
      .json({ data: countryData, message: "country updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a country by ID
const deleteCountry = async (req, res) => {
  const id = req.params.id;
  try {
    const deletedcountry = await countryModel.findByIdAndDelete(id);
    if (!deletedcountry) {
      return res.status(404).json({ message: "country not found" });
    }
    res.status(200).json({ message: "country deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createCountry,
  getCountryById,
  getAllCountries,
  updateCountry,
  deleteCountry,
};
