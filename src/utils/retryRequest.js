// Task 2.4: Retry utility function
export const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};
