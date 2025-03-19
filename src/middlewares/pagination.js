module.exports = (req, res, next) => {
  const defaultPage = 1;
  const defaultLimit = 25;
  const maximumLimit = 500;

  let page = parseInt(
    req.query.page ?? req.params.page ?? req.body.page ?? defaultPage,
    10,
  );
  let limit = parseInt(
    req.query.limit ?? req.params.page ?? req.body.limit ?? defaultLimit,
    10,
  );

  page = !Number.isNaN(page) && page > 0 ? page : defaultPage;
  limit =
    !Number.isNaN(limit) && limit > 0 && limit <= maximumLimit
      ? limit
      : defaultLimit;

  res.locals.offset = (page - 1) * limit;
  res.locals.limit = limit;

  next();
};
