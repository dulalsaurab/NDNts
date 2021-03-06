import { closeUplinks } from "@ndn/cli-common";
import { Name } from "@ndn/packet";
import { retrieveMetadata } from "@ndn/rdr";
import { discoverVersion, fetch } from "@ndn/segmented-object";
import stdout from "stdout-stream";
import { Arguments, Argv, CommandModule } from "yargs";

import { CommonArgs, segmentNumConvention, versionConvention } from "./common-args";

type DiscoverVersionChoice = "none"|"cbp"|"rdr";
const discoverVersionChoices: readonly DiscoverVersionChoice[] = ["none", "cbp", "rdr"];

interface Args extends CommonArgs {
  name: string;
  ver: DiscoverVersionChoice;
}

async function main(args: Args) {
  let name = new Name(args.name);
  switch (args.ver) {
    case "none":
      break;
    case "cbp":
      name = await discoverVersion(name, {
        segmentNumConvention,
        versionConvention,
      });
      break;
    case "rdr":
      name = (await retrieveMetadata(name)).name;
      break;
  }

  await fetch.toStream(name, stdout, { segmentNumConvention });
}

export class GetSegmentedCommand implements CommandModule<CommonArgs, Args> {
  public command = "get-segmented <name>";
  public describe = "retrieve segmented object";
  public aliases = ["get"];

  public builder(argv: Argv<CommonArgs>): Argv<Args> {
    return argv
      .positional("name", {
        desc: "name prefix",
        type: "string",
      })
      .demandOption("name")
      .option("ver", {
        choices: discoverVersionChoices,
        default: "none" as DiscoverVersionChoice,
        desc: ["version discovery method",
          "none: no discovery",
          "cbp: send Interest with CanBePrefix"].join("\n"),
      });
  }

  public handler(args: Arguments<Args>) {
    main(args)
      .finally(closeUplinks);
  }
}
