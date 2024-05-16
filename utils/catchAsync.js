module.exports = (fn) => {
  return (req, res, next) => {
    // (err) => next(err) is the same as writing only next as next automically get's called with the parameter that catch gives i.e. error
    fn(req, res, next).catch(next);
  };
};
