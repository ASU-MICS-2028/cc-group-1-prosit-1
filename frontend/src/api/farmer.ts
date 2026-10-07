import type { components } from "./schema"
import { api } from "./client"

type S = components["schemas"]
export type MyFarm = S["MyFarmResponse"]
export type FarmerProfile = S["FarmerProfile"]
export type Prices = S["PricesResponse"]
export type Weather = S["WeatherResponse"]
export type WeatherDay = S["WeatherDay"]
export type CropCheck = S["CropCheckResponse"]
export type CropSymptom = S["CropSymptom"]
export type HarvestForecast = S["HarvestForecastResponse"]
export type Cooperative = S["CooperativeResponse"]
export type Lessons = S["LessonsResponse"]
export type ChangeArea = S["ChangeArea"]
export type DataSource = S["DataSource"]

// The farmer's own data and farm services (FarmerService, ADR 0031). Answers with source "sample" come from
// a stand-in provider until the live source is connected; the screens label them "Sample data".

export const getMyFarm = () => api<MyFarm>("/api/farmer/me")
export const getPrices = () => api<Prices>("/api/farmer/prices")
export const getWeather = () => api<Weather>("/api/farmer/weather")
export const getHarvestForecast = () =>
  api<HarvestForecast>("/api/farmer/harvest-forecast")
export const getCooperative = () => api<Cooperative>("/api/farmer/cooperative")
export const getLessons = () => api<Lessons>("/api/farmer/lessons")

export const checkCrop = (body: S["CropCheckRequest"]) =>
  api<CropCheck>("/api/farmer/crop-check", { method: "POST", body })

export const requestChange = (body: S["ChangeRequest"]) =>
  api<S["ChangeRequestResponse"]>("/api/farmer/change-requests", {
    method: "POST",
    body,
  })
