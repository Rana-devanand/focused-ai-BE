import { type Request, type Response } from "express";
import asyncHandler from "express-async-handler";
import * as testerService from "./tester.service";
import { createResponse } from "../common/helper/response.hepler";

export const addTester = asyncHandler(async (req: Request, res: Response) => {
  const result = await testerService.addTester(req.body);
  res.send(createResponse(result, "Tester information submitted successfully"));
});

export const getAllTesters = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await testerService.getAllTesters();
    res.send(createResponse(result));
  },
);

export const updateTesterStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { active } = req.body;
    const result = await testerService.updateTesterStatus(id, active);
    res.send(createResponse(result, "Tester status updated successfully"));
  },
);
