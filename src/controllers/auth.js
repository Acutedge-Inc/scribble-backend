/**
 *
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
const performLogin = async (req, res) => {
  try {
    return res.json({ message: "ok" });
  } catch (err) {
    return res.send({ err });
  }
};

const health = async (req, res) => {
    try {
      return res.json({ message: "health" });
    } catch (err) {
      return res.send({ err });
    }
  };

module.exports = {
    performLogin,
    health,
};
