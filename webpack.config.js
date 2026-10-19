import { ServiceWorkerPlugin } from "./scripts/service-worker.mjs";
import path from "node:path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

export default (_env, argv) => ({
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename:
      argv.mode === "production" ? "[name].[contenthash].js" : "main.js",
    chunkFilename: "[name].[contenthash].js",
    path: path.resolve(import.meta.dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  devtool: argv.mode === "production" ? false : "eval-source-map",
  plugins: [
    ...(argv.mode === "production" ? [new ServiceWorkerPlugin()] : []),
    new HtmlWebpackPlugin({
      template: "./src/template.html",
      meta:
        argv.mode === "production"
          ? {
              "Content-Security-Policy": {
                "http-equiv": "Content-Security-Policy",
                content:
                  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
              },
            }
          : {},
    }),
    new MiniCssExtractPlugin({
      filename:
        argv.mode === "production"
          ? "style/[name].[contenthash].css"
          : "style/style.css",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: "esbuild-loader",
        options: { loader: "jsx", target: "es2020" },
      },
      {
        test: /\.html$/i,
        use: ["html-loader"],
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
        type: "asset/resource",
        generator: {
          filename: "img/[name].[hash][ext]",
        },
      },
    ],
  },
});
