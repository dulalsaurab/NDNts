import { Name } from "@ndn/packet";
import { Arguments, Argv, CommandModule } from "yargs";

import { keyChain, printCertBase64 } from "./util";

interface Args {
  name: string;
}

async function main({ name }: Args) {
  const certNames = await keyChain.listCerts(new Name(name));
  for (const certName of certNames) {
    const cert = await keyChain.getCert(certName);
    printCertBase64(cert);
  }
}

export class ShowCertCommand implements CommandModule<{}, Args> {
  public command = "show-cert <name>";
  public describe = "show certificate";

  public builder(argv: Argv): Argv<Args> {
    return argv
      .positional("name", {
        desc: "certificate name or prefix",
        type: "string",
      })
      .demandOption("name");
  }

  public handler(args: Arguments<Args>) {
    main(args);
  }
}
