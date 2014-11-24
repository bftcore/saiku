package org.saiku.web.export;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringWriter;

import org.codehaus.jackson.map.ObjectMapper;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.saiku.web.rest.objects.resultset.QueryResult;

public class JSConverter {

  /**
   *
   * @param qr
   * @param withSums :
  //0 - вывод всех сумм со всеми итогами
  //1 - вывод только промежуточных итогов
  //2 - вывод только окончательных итогов
  //3 - никаких итогов
   * @return
   * @throws IOException
   */
	public static String convertToHtml(QueryResult qr, int withSums) throws IOException {
		ObjectMapper om = new ObjectMapper();
		StringWriter sw = new StringWriter();
		Context context = Context.enter();
		Scriptable globalScope = context.initStandardObjects();
    Reader formatReader = new InputStreamReader(JSConverter.class.getResourceAsStream("format.20110630-1100.min.js"));
    context.evaluateReader(globalScope, formatReader, "format.20110630-1100.min.js", 1, null);

		Reader underscoreReader = new InputStreamReader(JSConverter.class.getResourceAsStream("underscore.js"));
		context.evaluateReader(globalScope, underscoreReader, "underscore.js", 1, null);
		Reader srReader = new InputStreamReader(JSConverter.class.getResourceAsStream("SaikuRenderer.js"));
		context.evaluateReader(globalScope, srReader, "SaikuRenderer.js", 1, null);
    switch (withSums) {
      case 0: {
        Reader strReader = new InputStreamReader(JSConverter.class.getResourceAsStream("SaikuTableRenderer(0).js"));
        context.evaluateReader(globalScope, strReader, "SaikuTableRenderer(0).js", 1, null);
        break;
      }
      case 1: {
        Reader strReader = new InputStreamReader(JSConverter.class.getResourceAsStream("SaikuTableRenderer(1).js"));
        context.evaluateReader(globalScope, strReader, "SaikuTableRenderer(1).js", 1, null);
        break;
      }
      case 2:{
        Reader strReader = new InputStreamReader(JSConverter.class.getResourceAsStream("SaikuTableRenderer(2).js"));
        context.evaluateReader(globalScope, strReader, "SaikuTableRenderer(2).js", 1, null);
        break;

      }
      case 3:{
        Reader strReader = new InputStreamReader(JSConverter.class.getResourceAsStream("SaikuTableRendererWithoutSums.js"));
        context.evaluateReader(globalScope, strReader, "SaikuTableRendererWithoutSums.js", 1, null);
        break;

      }
    }


		String data = om.writeValueAsString(qr);
		Object wrappedQr = Context.javaToJS(data, globalScope);
		ScriptableObject.putProperty(globalScope, "data", wrappedQr);
		
		Object wrappedOut = Context.javaToJS(sw, globalScope);
		ScriptableObject.putProperty(globalScope, "out", wrappedOut);
		
		String code = "eval('var cellset = ' + data); \nvar renderer = new SaikuTableRenderer(); \nvar html = renderer.render(cellset, { wrapContent : false }); out.write(html);";
		
		context.evaluateString(globalScope, code, "<mem>", 1, null);
		Context.exit();
		
		String content = sw.toString();
		return content;
	}

}

