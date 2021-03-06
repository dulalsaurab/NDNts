import { Certificate, EC_CURVES, EcCurve, EcPrivateKey, HmacKey, PrivateKey, PublicKey, RSA_MODULUS_LENGTHS, RsaModulusLength, RsaPrivateKey } from "@ndn/keychain";
import { NameLike } from "@ndn/packet";
import stdout from "stdout-stream";
import { Arguments, Argv, CommandModule } from "yargs";

import { keyChain } from "./util";

type TypeChoice = "ec"|"rsa"|"hmac";
const typeChoices: readonly TypeChoice[] = ["ec", "rsa", "hmac"];

interface Args extends GenKeyCommand.KeyParamArgs {
  name: string;
}

async function main(args: Args) {
  const { pvt, pub, canSelfSign } = await GenKeyCommand.generateKey(args.name, args);

  if (canSelfSign) {
    const cert = await Certificate.selfSign({ privateKey: pvt, publicKey: pub });
    await keyChain.insertCert(cert);
    stdout.write(`${cert.name}\n`);
  } else {
    stdout.write(`${pvt.name}\n`);
  }
}

export class GenKeyCommand implements CommandModule<{}, Args> {
  public command = "gen-key <name>";
  public describe = "generate key";
  public aliases = ["keygen"];

  public builder(argv: Argv): Argv<Args> {
    return GenKeyCommand.declareKeyParamArgs(argv)
      .positional("name", {
        desc: "subject name or key name",
        type: "string",
      })
      .demandOption("name");
  }

  public handler(args: Arguments<Args>) {
    main(args);
  }
}

export namespace GenKeyCommand {
  export interface KeyParamArgs {
    type: TypeChoice;
    curve: EcCurve;
    "modulus-length": RsaModulusLength;
  }

  export function declareKeyParamArgs<T>(argv: Argv<T>): Argv<T & KeyParamArgs> {
    return argv
      .option("type", {
        choices: typeChoices,
        default: "ec" as TypeChoice,
        desc: "key type",
      })
      .option("curve", {
        choices: EC_CURVES,
        default: "P-256" as EcCurve,
        desc: "EC curve",
      })
      .option("modulus-length", {
        choices: RSA_MODULUS_LENGTHS,
        default: 2048 as RsaModulusLength,
        desc: "RSA modulus length",
      });
  }

  export async function generateKey(name: NameLike, {
    type, curve, "modulus-length": modulusLength,
  }: KeyParamArgs): Promise<{
        pvt: PrivateKey;
        pub: PublicKey;
        canSelfSign: boolean;
      }> {
    switch (type) {
      case "ec": {
        const [pvt, pub] = await EcPrivateKey.generate(name, curve, keyChain);
        return { pvt, pub, canSelfSign: true };
      }
      case "rsa": {
        const [pvt, pub] = await RsaPrivateKey.generate(name, modulusLength, keyChain);
        return { pvt, pub, canSelfSign: true };
      }
      case "hmac": {
        const key = await HmacKey.generate(name, keyChain);
        return { pvt: key, pub: key, canSelfSign: false };
      }
      default:
        /* istanbul ignore next */
        throw new Error(`unknown type ${type}`);
    }
  }
}
