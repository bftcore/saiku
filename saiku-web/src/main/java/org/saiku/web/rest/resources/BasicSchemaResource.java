package org.saiku.web.rest.resources;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.vfs.FileObject;
import org.apache.commons.vfs.FileSystemManager;
import org.apache.commons.vfs.VFS;
import org.saiku.service.ISessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.ws.rs.FormParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.OutputStreamWriter;

/**
 * User: y.zakharov
 * Date: 01.07.15
 */
@Component
@Path("/saiku/{username}/schemarepository")
@XmlAccessorType(XmlAccessType.NONE)
public class BasicSchemaResource {
  private static final Logger log = LoggerFactory.getLogger(BasicSchemaResource.class);

  private FileObject repo;
  private ISessionService sessionService;

  public void setPath(String path) throws Exception {
    FileSystemManager fileSystemManager;
    try {
      if (!path.endsWith("" + File.separatorChar)) {
        path += File.separatorChar;
      }
      fileSystemManager = VFS.getManager();
      FileObject fileObject;
      fileObject = fileSystemManager.resolveFile(path);
      if (fileObject == null) {
        throw new IOException("File cannot be resolved: " + path);
      }
      if (!fileObject.exists()) {
        throw new IOException("File does not exist: " + path);
      }
      repo = fileObject;
    } catch (Exception e) {
      log.error("Error setting path for repository: " + path, e);
    }
  }

  public void setSessionService(ISessionService sessionService) {
    this.sessionService = sessionService;
  }

  @POST
  @Produces({"application/json"})
  @Path("/add")
  public Response saveNewSchema(@FormParam("file") String file,
                                @FormParam("content") String content) {

    try {
      if (file == null || file.startsWith("/") || file.startsWith(".")) {
        throw new IllegalArgumentException("Path cannot be null or start with \"/\" or \".\" - Illegal Path: " + file);
      }
      if (!file.endsWith(".xml")) {
        file = file + ".xml";
      }
      FileObject repoFile = repo.resolveFile(file);
      if (repoFile == null) {
        throw new Exception("Repo File not found");
      }

      if (repoFile.exists()) {
        repoFile.delete();
      } else {
        repoFile.createFile();
      }
      OutputStreamWriter ow = new OutputStreamWriter(repoFile.getContent().getOutputStream());
      BufferedWriter bw = new BufferedWriter(ow);
      bw.write(content);
      bw.close();
      return Response.ok().build();
    } catch (Exception e) {
      log.error("Cannot save schema to ( file: " + file + ")", e);
    }
    return Response.serverError().entity("Cannot save schema to ( file: " + file + ")").type("text/plain").build();

  }
}
