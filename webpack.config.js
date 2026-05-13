import path from "node:path";
import { fileURLToPath } from "node:url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    }
  },
  devtool: "eval-source-map",
  devServer: {
    port: 4000,
    hot: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "/src/template.html",
    }),
    new MiniCssExtractPlugin({
      filename: "style/style.css"
    })
  ],
  module: {
    rules: [
      {
        test: /\.html$/i,
        use: ["html-loader"],
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(sass|scss)$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
        type: "asset/resource",
        generator: {
          filename: 'img/[name].[hash][ext]'
        }
      },
      {
        test: /\.(ttf|woff|woff2|eot)$/i,
        type: "asset/resource",
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      },
    ],
  },
}