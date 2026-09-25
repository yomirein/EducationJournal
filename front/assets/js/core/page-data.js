// Every block that shows API data registers its loader here. After a successful
// change the page calls refreshPageData(), so lists never show stale data.
const pageLoaders = new Set();

const registerLoader = loader => {
  pageLoaders.add(loader);

  return run(loader);
};

const refreshPageData = () => Promise.all([...pageLoaders].map(loader => run(loader)));
