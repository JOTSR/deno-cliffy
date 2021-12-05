import { runBenchmarks } from "../dev_deps.ts";

import "./benchmarks/simple_command.ts";
import "./benchmarks/complex_command.ts";

interface BenchResult {
  totalMs: number;
  runsCount: number;
  measuredRunsAvgMs: number;
}

interface TestData {
  name: string;
  history: Array<BenchResult>;
}

interface ModuleData {
  name: string;
  tests: Array<TestData>;
}
type BenchData = Array<ModuleData>;

if (import.meta.main) {
  const outputFile: string | undefined = Deno.args[0];
  const commit = Deno.args[1];
  const timestamp = Date.now();
  await runBenchmarks({
    silent: false,
  }, async (progress) => {
    if (progress.state === "benchmarking_end") {
      const json: string | undefined = outputFile &&
          await Deno.readTextFile(outputFile).catch(() => undefined) ||
        undefined;

      const data: BenchData = (json && JSON.parse(json)) ?? [];

      const output = progress.results.map((result) => {
        let [moduleName, testName] = result.name.split(":").map((val) =>
          val.trim()
        );
        if (!testName) {
          testName = moduleName;
          moduleName = "default";
        }

        const entry = {
          totalMs: result.totalMs,
          runsCount: result.runsCount,
          measuredRunsAvgMs: result.measuredRunsAvgMs,
          commit,
          timestamp,
        };

        if (outputFile && result.name !== "warmup") {
          let module: ModuleData | undefined = data.find((module) =>
            module.name === moduleName
          );
          if (!module) {
            module = { name: moduleName, tests: [] };
            data.push(module);
          }

          let test: TestData | undefined = module.tests.find((test) =>
            test.name === testName
          );
          if (!test) {
            test = { name: testName, history: [] };
            module.tests.push(test);
          }

          test.history.push(entry);
        }

        return entry;
      });

      if (outputFile) {
        await Deno.writeTextFile(outputFile, JSON.stringify(data, null, 2), {
          create: true,
        });
      } else {
        console.log(output);
      }
    }
  });
}