const axios = require("axios");
let data = require("./testData.json");

(() => {
  let promise = Promise.resolve();

  data.forEach((item) => {
    promise = promise.then(() => {
      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://api.acutedge.com/api/v1/visit`,
        headers: {
          accept: "application/json",
          "x-tenant-id": "67cf182ecd6dbb2d123519ea",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2IjoyLCJ0eXBlIjoiYWNjZXNzIiwiaWQiOiI2N2Q2YTEwYjg0OWRmODdiYTc3NDljMzMiLCJyb2xlcyI6WyJ1c2VyIl0sInNjb3BlcyI6WyJhc3Nlc3NtZW50LmNyZWF0ZSIsImFzc2Vzc21lbnQucmVhZCIsImFzc2Vzc21lbnQudXBkYXRlIiwiYXNzZXNzbWVudC5kZWxldGUiLCJhbnN3ZXIuY3JlYXRlIiwiYW5zd2VyLnJlYWQiLCJhbnN3ZXIudXBkYXRlIiwiYW5zd2VyLmRlbGV0ZSIsImZvcm0uY3JlYXRlIiwiZm9ybS5yZWFkIiwiZm9ybS51cGRhdGUiLCJmb3JtLmRlbGV0ZSIsInZpc2l0LmNyZWF0ZSIsInZpc2l0LnJlYWQiLCJ2aXNpdC51cGRhdGUiLCJzZWxmLnJlYWQiLCJzZWxmLnVwZGF0ZSJdLCJpc3N1ZXIiOiJTY3JpYmJsZSIsImlhdCI6MTc0MzQyMzY3NCwiZXhwIjoxNzQ0MDIzNjc0fQ.BYHyQNYbWUiNeIFnp9kaLmulU6xQ25Vc-UctdYNOM8k",
          "Content-Type": "application/json",
        },
        data: JSON.stringify(item),
      };

      return axios
        .request(config)
        .then((response) => {
          console.log(JSON.stringify(response.data.data));
        })
        .catch((error) => {
          console.log(error);
        });
    });
  });
})();
