import { notice, error, getInput, setFailed, setOutput, InputOptions } from '@actions/core'
import { stream } from 'fast-glob';
import { dirname, extname, resolve, join, basename } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { envBool } from 'env-bool';
import JSZip from 'jszip';
import { fixedJSZipDate } from 'jszip-fixed-date';
import { createHash } from 'crypto';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ms: string = getInput('milliseconds')

    let outputFile: string = getInput('outputFile');
    outputFile = resolve(outputFile);

    let paths: string | string[] = getInput('paths')

    paths = paths?.split(/[\r\n]/).reduce((a, v) =>
    {

      v = v.trim();
      if (v.length)
      {
        a.push(v)
      }

      return a
    }, [] as string[]);

    notice(`paths: ${paths}`)

    if (!paths?.length)
    {
      throw new RangeError(`The paths should not be empty`)
    }

    const autoCreateOutputDir = getInputEnvBool('autoCreateOutputDir');

    let zip = new JSZip();
    let list: string[] = [];

    for await (const file of stream(paths, {
      //absolute: true,
      onlyFiles: true,
      throwErrorOnBrokenSymbolicLink: true,
      unique: true,
    }) as any as string[])
    {
      notice(`processing [${(list.length + 1).toString().padStart(3, '0')}] ${file}`);
      list.push(file);

      zip_add_file(zip, file);
    }

    if (list.length)
    {
      fixedJSZipDate(zip, new Date('2000-12-24 23:00:00Z'));

      await zip.generateAsync({
        type: 'nodebuffer',
        mimeType: 'application/zip',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        },
      }).then(async (buf) =>
      {
        const md5 = createHash('md5');
        const result = md5.update(buf).digest('hex');

        notice(result);

        if (autoCreateOutputDir)
        {
          await mkdir(dirname(outputFile), {
            recursive: true,
          })
        }

        setOutput('hash', result)

        return writeFile(outputFile, buf)
      })
    }
    else
    {
      throw new RangeError(`Can't found list of files`)
    }

    setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message)
  }
}

function getInputEnvBool(name: string, options?: InputOptions)
{
  return envBool(getInput(name, options)) as boolean
}

function zip_add_file(zip: JSZip, src_path: string, zip_filename?: string)
{
  return zip.file(zip_filename ?? basename(src_path), readFile(src_path));
}
