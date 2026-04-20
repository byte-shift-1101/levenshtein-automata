use std::io::{Read, Write};

use serde::de::{Deserializer as _, IgnoredAny, MapAccess, Visitor};

struct StreamingWordWriter<'a, W: Write> {
    writer: &'a mut W,
}

impl<'de, W: Write> Visitor<'de> for StreamingWordWriter<'_, W> {
    type Value = usize;

    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("a JSON object with string keys")
    }

    fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
    where
        A: MapAccess<'de>,
    {
        let mut count = 0usize;
        while let Some(word) = map.next_key::<String>()? {
            map.next_value::<IgnoredAny>()?;
            writeln!(self.writer, "{word}").map_err(serde::de::Error::custom)?;
            count += 1;
        }
        Ok(count)
    }
}

pub fn stream_dictionary_to_writer<R: Read, W: Write>(
    reader: R,
    writer: &mut W,
) -> Result<usize, Box<dyn std::error::Error>> {
    let mut deserializer = serde_json::Deserializer::from_reader(reader);
    let visitor = StreamingWordWriter { writer };
    let count = deserializer.deserialize_map(visitor)?;
    Ok(count)
}

#[cfg(not(target_arch = "wasm32"))]
pub fn stream_dictionary_file_to_file(
    input_filename: &str,
    output_filename: &str,
) -> Result<usize, Box<dyn std::error::Error>> {
    use std::fs::File;
    use std::io::{BufReader, BufWriter};

    let input = File::open(input_filename)?;
    let mut output = BufWriter::new(File::create(output_filename)?);
    let count = stream_dictionary_to_writer(BufReader::new(input), &mut output)?;
    output.flush()?;
    Ok(count)
}
