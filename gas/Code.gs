// gas/Code.gs — Router only (doGet, doPost, handleRequest, respond)
// All business logic is in separate .gs files sharing the same global scope.

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    initSheets();
    let params = {};
    if (e.postData && e.postData.contents) {
      // Phase 1 UTF-8 fix: use getDataAsString to handle Thai characters correctly
      params = JSON.parse(e.postData.getDataAsString('UTF-8'));
    } else if (e.parameter) {
      params = e.parameter;
    }
    const action = params.action;

    if (action === 'login') return respond(login(params));

    const user = verifyToken(params.token);
    if (!user) return respond({ success: false, error: 'Unauthorized' });

    switch (action) {
      // Trucks
      case 'gettrucks':         return respond(getTrucks());
      case 'updatetruck':       return respond(updateTruck(params, user));
      // Save logs
      case 'saveblow':          return respond(saveBlow(params, user));
      case 'savegreasing':      return respond(saveGreasing(params, user));
      case 'savedrain':         return respond(saveDrain(params, user));
      case 'savecall':          return respond(saveCall(params, user));
      case 'saveviolation':     return respond(saveViolation(params, user));
      case 'savereport':        return respond(saveReport(params, user));
      // Images & PDF
      case 'uploadimage':       return respond(uploadImage(params, user));
      case 'savepdf':           return respond(savePDFToDrive(params, user));
      // Get data
      case 'gethistory':        return respond(getHistory(params));
      case 'getstats':          return respond(getStats(params));
      case 'getdashboardfull':  return respond(getDashboardFull(params));
      case 'getcompare':        return respond(getCompare(params));
      case 'getviolations':     return respond(getViolations(params));
      case 'getreporthistory':  return respond(getReportHistory());
      case 'getfleetstatus':    return respond(getFleetStatus(params));
      case 'getnotifications':  return respond(getNotifications(params, user));
      // Stop orders & warning letters
      case 'issuestoporder':    return respond(issueStopOrder(params, user));
      case 'getstoporders':     return respond(getStopOrders(params));
      case 'updatestoporder':   return respond(updateStopOrder(params, user));
      case 'approvestoporder':  return respond(approveStopOrder(params, user));
      case 'recordcompletion':  return respond(recordCompletion(params, user));
      case 'getwarningletters': return respond(getWarningLetters(params));
      case 'approvewarningletter': return respond(approveWarningLetter(params, user));
      // Users
      case 'getusers':          return respond(getUsers(user));
      case 'adduser':           return respond(addUser(params, user));
      case 'deleteuser':        return respond(deleteUser(params, user));
      case 'resetpassword':     return respond(resetPassword(params, user));
      case 'updateuser':        return respond(updateUser(params, user));
      default: return respond({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return respond({ success: false, error: err.toString() });
  }
}

function respond(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
