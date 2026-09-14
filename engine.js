"use strict";
/* =======================================================================
   Rapid Traverse — shared engine
   The deck, the G-code interpreter, the canvas renderers, the schematics
   and the demo player. Loaded by index.html (Drill / Simulator / Reference)
   and by study.html (the pocket study app), so the 63 cards and their
   animated demos have exactly one source.

   Sections:  1 DECK DATA  ·  2 G-CODE INTERPRETER  ·  3 CANVAS RENDERERS
              4 SCHEMATICS ·  5 DEMO PLAYER
   ======================================================================= */

/* ---------------------------- 1 · DECK DATA ---------------------------- */
/* desc = verbatim from the code sheets. plain / tip = study notes. */

const gc = (view, src, stock) => ({ k:'gc', view, src, stock });
const sc = (n, o) => ({ k:'sc', n, o: o || {} });

const CARDS = [
/* ---- motion ---- */
{c:'G00', f:'G', cat:'Motion', mg:'01', desc:'Rapid position mode',
 plain:'Positioning at the machine’s maximum traverse rate. Every axis runs flat out and they can finish at different times, so the route between two points is not guaranteed to be a straight line.',
 blk:'G90 G00 X2.0 Y1.25',
 tip:'Rapid is not a cutting move. Check your clearance in Z before any G00 that crosses a fixture — the dog-leg path is where clamps get hit.',
 demo:gc('xy','G90 G00 X0 Y0\nG00 X2.0 Y1.25')},

{c:'G01', f:'G', cat:'Motion', mg:'01', desc:'Linear interpolation',
 plain:'A straight-line cutting move at the commanded feed. The axes are coordinated so they all arrive at the endpoint together.',
 blk:'G01 X2.0 Y1.25 F10.',
 tip:'G01 needs an F. The control carries the last F forward, so a feed left over from forty blocks ago is still in force until you change it.',
 demo:gc('xy','G90 G00 X0 Y0\nG01 X2.0 Y1.25 F10.')},

{c:'G02', f:'G', cat:'Motion', mg:'01', desc:'Circular interpolation : CW',
 plain:'Cuts an arc clockwise as seen looking down the plane’s third axis — in G17 that means looking down at XY from +Z. Size it with I and J (the incremental vector from the start point to the arc centre) or with R.',
 blk:'G02 X1.5 Y1.5 I1.0 J0. F8.',
 tip:'Clockwise is judged from the positive axis of the active plane. Switch to G18 or G19 and the direction you see from the front changes with it.',
 demo:gc('xy','G90 G17 G00 X0.5 Y0.5\nG02 X1.5 Y1.5 I1.0 J0. F8.')},

{c:'G03', f:'G', cat:'Motion', mg:'01', desc:'Circular interpolation : CCW',
 plain:'The same arc, counter-clockwise. I and J still point from the start of the arc to its centre, whichever way you are going round.',
 blk:'G03 X1.5 Y1.5 I0. J1.0 F8.',
 tip:'R is quicker to write but ambiguous past 180° — a positive R takes the short way round, a negative R the long way. I and J are never ambiguous.',
 demo:gc('xy','G90 G17 G00 X0.5 Y0.5\nG03 X1.5 Y1.5 I0. J1.0 F8.')},

/* ---- non-modal / program ---- */
{c:'G04', f:'G', cat:'Program', mg:'—', desc:'Dwell (measured in seconds)',
 plain:'Holds the tool where it is, spindle still turning, for a set time. Used to let a boring tool clean up the bottom of a counterbore or to give a spindle time to come up to speed.',
 blk:'G04 X1.5   (hold 1.5 seconds)',
 tip:'Non-modal — it lives for the one block it is written in. This control reads the dwell in seconds; plenty of other controls read P in thousandths.',
 demo:sc('dwell')},

{c:'G10', f:'G', cat:'Program', mg:'—', desc:'Offset entry through program',
 plain:'Writes a value straight into an offset register from inside the program, so a program can set its own tool lengths, wear values or work offsets instead of relying on what is typed at the control.',
 blk:'G10 L2 P1 X-12.5 Y-6.25 Z0.',
 tip:'Non-modal, and it overwrites whatever the operator entered on the offset page. Very useful, completely unforgiving.',
 demo:sc('offsets')},

/* ---- setup ---- */
{c:'G15', f:'G', cat:'Setup', mg:'17', desc:'Polar Coordinate programming off',
 plain:'Returns to ordinary Cartesian programming, where X and Y mean distances along the axes again.',
 blk:'G15   (back to plain XY)',
 tip:'Cancel polar before the next feature. Leaving G16 on and writing an ordinary XY move is how you get a very expensive spiral.',
 demo:sc('polar',{on:false})},

{c:'G16', f:'G', cat:'Setup', mg:'17', desc:'Polar Coordinate programming on',
 plain:'Lets you give a position as a radius and an angle instead of X and Y. In G17 the first axis word is the radius and the second is the angle, measured from the active work zero.',
 blk:'G16\nG01 X1.5 Y30.\nY60.',
 tip:'Made for bolt circles: set the radius once, then step the angle. Hole positions stop being arithmetic and start being obvious.',
 demo:sc('polar',{on:true})},

{c:'G17', f:'G', cat:'Setup', mg:'02', desc:'Plane selection  XY',
 plain:'Selects the XY plane for arcs and cutter compensation — the plane you are in for ordinary milling on a vertical machine.',
 blk:'G17 G90 G40 G80',
 tip:'Arcs and cutter comp are meaningless without a plane. G17 is the power-up default on a VMC and the control holds it until told otherwise.',
 demo:sc('planes',{p:17})},

{c:'G18', f:'G', cat:'Setup', mg:'02', desc:'Plane selection  ZX',
 plain:'Selects the ZX plane, so an arc is cut in the vertical plane running along X. Used for radiusing an edge or cutting a ball-nose form down a side.',
 blk:'G18 G02 X1.0 Z-0.25 I0.25 K0.',
 tip:'In G18 the arc centre words change: I goes with X and K goes with Z. J has nothing to do in this plane.',
 demo:sc('planes',{p:18})},

{c:'G19', f:'G', cat:'Setup', mg:'02', desc:'Plane selection  ZY',
 plain:'Selects the ZY plane — the vertical plane running along Y, the other way round from G18.',
 blk:'G19 G03 Y1.0 Z-0.25 J0.25 K0.',
 tip:'Here the centre words are J for Y and K for Z. Get the plane and the centre letters out of step and the control alarms rather than cutting scrap, which is the one mercy.',
 demo:sc('planes',{p:19})},

{c:'G20', f:'G', cat:'Setup', mg:'06', desc:'Inch data input',
 plain:'Every coordinate, feed and offset from here on is read in inches.',
 blk:'G20 G17 G40 G80 G90',
 tip:'Put it in the safety line at the top, before any motion. Switching units part way through re-reads every offset in the new unit and the numbers stop meaning what you think.',
 demo:sc('units',{u:'in'})},

{c:'G21', f:'G', cat:'Setup', mg:'06', desc:'Metric data input',
 plain:'Every coordinate, feed and offset from here on is read in millimetres.',
 blk:'G21 G17 G40 G80 G90',
 tip:'Check which one is active before you trust a number on the screen. A Z‑.100 in inch is a light skim; in metric it is a tenth of a millimetre.',
 demo:sc('units',{u:'mm'})},

/* ---- reference return ---- */
{c:'G28', f:'G', cat:'Reference', mg:'00', desc:'Return to machine Zero position (Home)',
 plain:'Sends the axes back to machine zero by way of an intermediate point that you supply, so you choose the route out rather than hoping for the best.',
 blk:'G91 G28 Z0.\nG28 X0. Y0.',
 tip:'Send Z home first, and write it incrementally as G91 G28 Z0. so the intermediate point is exactly where the tool already is. Then bring X and Y home.',
 demo:gc('both','G90 G00 X1.6 Y0.9 Z0.1\nG91 G28 Z0.\nG28 X0. Y0.')},

{c:'G30', f:'G', cat:'Reference', mg:'00', desc:'Return to Tool change reference position',
 plain:'The same idea as G28 but to the second reference point — usually the one position the machine must be sitting in before the carousel will swap tools.',
 blk:'G91 G30 Z0.\nM06 T02',
 tip:'On many machines the tool change simply will not run anywhere else. If a change hangs, check where G30 actually sends the axes before blaming the carousel.',
 demo:sc('carousel',{mode:'ref'})},

/* ---- compensation ---- */
{c:'G40', f:'G', cat:'Compensation', mg:'07', desc:'Cutter Radius compensation = cancel',
 plain:'Turns cutter compensation off and puts the tool centre back on the programmed line.',
 blk:'G01 X-0.6 Y-0.6 G40 F20.',
 tip:'Cancel it on a lead-out move heading away from the part, never on the finish pass. G40 on the part line drags the cutter back into the wall.',
 demo:sc('comp',{side:'off'})},

{c:'G41', f:'G', cat:'Compensation', mg:'07', desc:'Cutter Radius compensation = Tool left',
 plain:'Offsets the tool to the left of the programmed direction of travel by the radius stored in the D register — so you program the finished part line and dial size in at the control.',
 blk:'G01 G41 D01 X0. Y0. F18.',
 tip:'Comp has to come on during a lead-in move that is at least one cutter radius long and clear of the part. Switching it on against the wall gouges.',
 demo:sc('comp',{side:'left'})},

{c:'G42', f:'G', cat:'Compensation', mg:'07', desc:'Cutter Radius compensation = Tool right',
 plain:'The mirror of G41: the tool sits to the right of the programmed direction of travel.',
 blk:'G01 G42 D01 X0. Y0. F18.',
 tip:'Left or right is decided facing the direction of travel, not from where you stand at the door. Which one you want follows from climb or conventional and whether you are inside or outside the part.',
 demo:sc('comp',{side:'right'})},

{c:'G43', f:'G', cat:'Compensation', mg:'08', desc:'Tool length compensation : plus direction',
 plain:'Adds the length stored in the H register to every Z move, so Z0. means the top of the part no matter how far the tool sticks out of the spindle.',
 blk:'G43 H01 Z1.0 M08',
 tip:'The H number is not automatically the T number. Pairing T01 with H02 is the classic way to find out what a crash sounds like — read the pair back before you run.',
 demo:sc('tlo')},

/* ---- work offsets ---- */
{c:'G54–G59', f:'G', cat:'Work Offsets', mg:'14', desc:'Workpiece coordinate system selection #1 - #6',
 plain:'Six stored positions that tell the machine where part zero sits on the table. Call one and every coordinate you program is measured from it.',
 blk:'G90 G54 G00 X0. Y0.',
 tip:'Setting the offset is a setup job; calling it is a programming job. A program with no G54–G59 in it runs on whatever was left active by the last job.',
 demo:sc('wcs',{ext:false})},

{c:'G54P1-G54P48', f:'G', cat:'Work Offsets', mg:'14', desc:'Additional 48 Workpiece coordinate system selection',
 plain:'Another forty-eight work offsets, addressed as G54 P1 through G54 P48, for fixtures holding more parts than the first six offsets can cover.',
 blk:'G54 P12 G00 X0. Y0.',
 tip:'Ideal with M98: write the part once as a subprogram, then call it under each offset in turn. Fifty parts, one piece of geometry.',
 demo:sc('wcs',{ext:true})},

/* ---- canned cycles ---- */
{c:'G73', f:'G', cat:'Canned Cycles', mg:'09', desc:'Peck drill cycle (stays in hole)',
 plain:'Pecks down in Q-sized bites but only backs off a whisker between pecks, just enough to snap the chip. The drill never leaves the hole, so it is quick.',
 blk:'G73 X1. Y1. Z-0.75 Q0.15 R0.1 F6.',
 tip:'This breaks chips, it does not clear them. In gummy material or past about four diameters deep, use G83 instead and let the chips out.',
 demo:gc('xz','G90 G98 G00 X0.6 Y0.5 Z0.6\nG73 X0.6 Y0.5 Z-0.75 Q0.18 R0.1 F6.\nG80',[0,0,1.2,-0.9])},

{c:'G74', f:'G', cat:'Canned Cycles', mg:'09', desc:'Tapping cycle (left)',
 plain:'The tapping cycle for left-hand threads: the spindle runs in reverse on the way down and forward on the way back out.',
 blk:'G74 X1. Y1. Z-0.5 R0.25 F3.125',
 tip:'Feed still has to equal pitch × rpm, exactly as for G84 — only the direction changes. Call M29 first if you are rigid tapping.',
 demo:sc('tap',{dir:'left'})},

{c:'G80', f:'G', cat:'Canned Cycles', mg:'09', desc:'Canned cycle cancel',
 plain:'Switches the active canned cycle off. Until you do, every following block that carries an X or a Y drills another hole at that point.',
 blk:'G80 G00 Z1.0',
 tip:'Forgetting G80 is the classic way to drill a hole in the middle of your next contour. Put it in the safety line at the top of every program too.',
 demo:sc('cancel')},

{c:'G81', f:'G', cat:'Canned Cycles', mg:'09', desc:'Drilling cycle, spot drilling',
 plain:'Rapid across to the hole, rapid down to the R plane, feed to depth, retract. One continuous plunge with no pecking — the plain drilling cycle.',
 blk:'G81 X1. Y1. Z-0.375 R0.1 F6.',
 tip:'Each following block with only an X and a Y drills another hole with the same Z, R and F. That is what makes canned cycles worth using.',
 demo:gc('xz','G90 G99 G00 X0.4 Y0.5 Z0.6\nG81 X0.4 Y0.5 Z-0.45 R0.1 F6.\nX1.0\nG80',[0,0,1.4,-0.7])},

{c:'G82', f:'G', cat:'Canned Cycles', mg:'09', desc:'Drilling cycle, counter boring',
 plain:'The same as G81 but it dwells at the bottom for the time in P, so the tool wipes the bottom of the hole clean instead of leaving a spiral step.',
 blk:'G82 X1. Y1. Z-0.2 R0.1 P500 F5.',
 tip:'This is the cycle for counterbores, spot faces and spot drills — anywhere the bottom of the hole is a surface somebody will measure.',
 demo:gc('xz','G90 G99 G00 X0.7 Y0.5 Z0.6\nG82 X0.7 Y0.5 Z-0.3 R0.1 P800 F5.\nG80',[0,0,1.4,-0.7])},

{c:'G83', f:'G', cat:'Canned Cycles', mg:'09', desc:'Peck drilling',
 plain:'Feeds down by Q, then rapids all the way back out to the R plane to throw the chip clear, returns to just above the last depth and takes the next bite. The cycle for deep holes.',
 blk:'G83 X1. Y1. Z-1.25 Q0.2 R0.1 F5.',
 tip:'Slower than G73, and worth every second past about four diameters deep. A drill packed with chips is a drill about to snap.',
 demo:gc('xz','G90 G98 G00 X0.6 Y0.5 Z0.6\nG83 X0.6 Y0.5 Z-0.85 Q0.22 R0.1 F5.\nG80',[0,0,1.2,-1.0])},

{c:'G84', f:'G', cat:'Canned Cycles', mg:'09', desc:'Tapping cycle (right)',
 plain:'The right-hand tapping cycle: feed down one thread pitch per revolution, reverse the spindle at the bottom, feed back out.',
 blk:'M29 S500\nG84 X1. Y1. Z-0.5 R0.25 F25.',
 tip:'Feed must equal pitch × rpm. A ¼‑20 tap at 500 rpm wants 25 in/min — get that number wrong and you either strip the thread or snap the tap.',
 demo:sc('tap',{dir:'right'})},

{c:'G86', f:'G', cat:'Canned Cycles', mg:'09', desc:'Standard Boring Cycle',
 plain:'Feeds the boring bar to depth, stops the spindle, then rapids straight out of the hole.',
 blk:'G86 X1. Y1. Z-0.6 R0.1 F4.',
 tip:'The stopped tool drags a witness line up the bore on the way out. Fine for roughing; for a finished bore you want the spindle oriented and the tool shifted clear first.',
 demo:gc('xz','G90 G99 G00 X0.7 Y0.5 Z0.6\nG86 X0.7 Y0.5 Z-0.55 R0.1 F4.\nG80',[0,0,1.4,-0.75])},

/* ---- modes ---- */
{c:'G90', f:'G', cat:'Modes', mg:'03', desc:'Absolute command',
 plain:'Every coordinate is measured from part zero. X1.0 means the point one inch from zero, wherever the tool happens to be standing now.',
 blk:'G90 G01 X1.0 Y1.0',
 tip:'Absolute is self-correcting: one wrong block puts one feature in the wrong place and the rest of the part is still right.',
 demo:sc('absinc',{mode:'abs'})},

{c:'G91', f:'G', cat:'Modes', mg:'03', desc:'Incremental command',
 plain:'Every coordinate is a distance and direction from wherever the tool is right now. X1.0 means go one inch further along X.',
 blk:'G91 G01 X1.0 Y1.0',
 tip:'Errors compound — one wrong move shifts everything after it. Use it for repeating patterns and for G28, and get back to G90 straight afterwards.',
 demo:sc('absinc',{mode:'inc'})},

{c:'G94', f:'G', cat:'Modes', mg:'05', desc:'Inches Per Minute feed rate',
 plain:'Feed is read as inches per minute. The tool covers a set distance each minute no matter what the spindle is doing.',
 blk:'G94 G01 X2.0 F12.   (12 in/min)',
 tip:'The normal milling mode. If the spindle stalls or you knock the speed back on the override, the feed keeps going at the same rate — which is how cutters get buried.',
 demo:sc('feedmode',{m:'ipm'})},

{c:'G95', f:'G', cat:'Modes', mg:'05', desc:'Inches Per Revolution feed rate',
 plain:'Feed is read as inches per revolution, so the chip load stays put when the spindle speed changes. The natural mode for drilling and tapping.',
 blk:'G95 G01 Z-0.5 F0.005   (.005 in/rev)',
 tip:'The numbers are small — thousandths, not tens. Writing F6. in G95 asks for six inches of travel per revolution.',
 demo:sc('feedmode',{m:'ipr'})},

/* ---- canned cycle return ---- */
{c:'G98', f:'G', cat:'Canned Cycles', mg:'10', desc:'Return to initial point in canned cycle',
 plain:'At the end of every hole the tool retracts all the way back to the Z height the cycle started from — high enough to clear clamps, steps and anything else standing up off the part.',
 blk:'G98 G81 X1. Y1. Z-0.4 R0.1 F6.',
 tip:'Slower between holes, but it is what saves you when a clamp sits between two holes. Reach for it whenever the part is not flat and open.',
 demo:gc('xz','G90 G98 G00 X0.35 Y0.5 Z0.75\nG81 X0.35 Y0.5 Z-0.4 R0.1 F6.\nX1.05\nG80',[0,0,1.4,-0.6])},

{c:'G99', f:'G', cat:'Canned Cycles', mg:'10', desc:'Return to ‘R’ point in canned cycle',
 plain:'Between holes the tool only pulls back to the R plane, then rapids across to the next one. Much less air to cut.',
 blk:'G99 G81 X1. Y1. Z-0.4 R0.1 F6.',
 tip:'Fast, as long as nothing stands between the holes. Watch the two demos back to back: same program, one word different, and the tool takes a completely different route.',
 demo:gc('xz','G90 G99 G00 X0.35 Y0.5 Z0.75\nG81 X0.35 Y0.5 Z-0.4 R0.1 F6.\nX1.05\nG80',[0,0,1.4,-0.6])},

/* ============================ M CODES ============================ */
{c:'M00', f:'M', cat:'Program', desc:'Program stop',
 plain:'Stops the program dead: spindle off, coolant off, feed held, everything still where it was. Cycle start picks it up again from the next block.',
 blk:'M00   (measure bore, then cycle start)',
 tip:'Unconditional — it stops whether anybody wants it to or not. Use it for a mid-program measurement or a part flip, and write a note in brackets saying why it is there.',
 demo:sc('program',{kind:'m00'})},

{c:'M01', f:'M', cat:'Program', desc:'Optional stop',
 plain:'The same stop, but only when the operator has OPTIONAL STOP lit on the control. With the light off the machine runs straight past it.',
 blk:'M01   (skipped unless OPT STOP is on)',
 tip:'Put one after each tool. First part off, run with it on and check as you go; once the job is proven, switch it off and let it run.',
 demo:sc('program',{kind:'m01'})},

{c:'M03', f:'M', cat:'Spindle', desc:'Forward spindle',
 plain:'Starts the spindle clockwise, looking down the spindle at the tool. The normal direction for ordinary right-hand cutters and drills.',
 blk:'S2400 M03',
 tip:'Give it an S word. M03 with no speed set either alarms or runs at whatever the last tool was using, which is rarely what this one wants.',
 demo:sc('spindle',{dir:1})},

{c:'M04', f:'M', cat:'Spindle', desc:'Reverse spindle',
 plain:'Starts the spindle counter-clockwise — for left-hand tooling, left-hand taps and back-boring.',
 blk:'S800 M04',
 tip:'Running a right-hand cutter in reverse rubs the flank instead of cutting. It sounds wrong immediately; stop before it work-hardens the surface.',
 demo:sc('spindle',{dir:-1})},

{c:'M05', f:'M', cat:'Spindle', desc:'Spindle stop',
 plain:'Stops the spindle and leaves it free to turn.',
 blk:'M05',
 tip:'Get the tool clear of the work first. Stopping the spindle with the cutter still engaged marks the surface and can grab.',
 demo:sc('spindle',{dir:0})},

{c:'M06', f:'M', cat:'Tooling', desc:'Tool change',
 plain:'Swaps whatever is in the spindle for the tool in T. Needs a T word, and on most machines needs the axes parked at the tool change position first.',
 blk:'G91 G30 Z0.\nT02 M06',
 tip:'The tool change does not bring the offset with it. Follow every M06 with its own G43 H__ before the first Z move, or the new tool works to the old tool’s length.',
 demo:sc('carousel',{mode:'change'})},

{c:'M08', f:'M', cat:'Coolant', desc:'Coolant on',
 plain:'Turns the flood coolant on — the nozzles around the spindle nose.',
 blk:'G43 H01 Z1.0 M08',
 tip:'Hang it on the block that brings the tool down to the part so the coolant is already flowing when the cut starts. In cast iron and some hardened work, dry is the correct answer.',
 demo:sc('coolant',{kind:'flood', on:true})},

{c:'M09', f:'M', cat:'Coolant', desc:'Coolant off',
 plain:'Turns the coolant off. One M09 covers flood, chip flush and through-spindle together.',
 blk:'G00 Z1.0 M09',
 tip:'M30 shuts the coolant off anyway, but turning it off before the tool change keeps the carousel and the floor dry.',
 demo:sc('coolant',{kind:'flood', on:false})},

{c:'M10', f:'M', cat:'Machine Options', desc:'Rotary Table Clamp (Option)',
 plain:'Locks the rotary table so the cut cannot push it off position.',
 blk:'G00 A90. \nM10   (clamp before cutting)',
 tip:'Index, then clamp, then cut. Cutting on an unclamped table lets the cutter walk the axis and the finish tells on you straight away.',
 demo:sc('rotary',{clamped:true})},

{c:'M11', f:'M', cat:'Machine Options', desc:'Rotary Table Unclamp (Option)',
 plain:'Releases the rotary table clamp so the axis is free to index.',
 blk:'M11\nG00 A180.',
 tip:'Trying to index against a clamped table is a good way to trip the axis or damage the drive. Unclamp first, every time.',
 demo:sc('rotary',{clamped:false})},

{c:'M13', f:'M', cat:'Spindle', desc:'Forward spindle and coolant on',
 plain:'Starts the spindle clockwise and turns the coolant on, both from a single word.',
 blk:'S2400 M13',
 tip:'This is why the combined codes exist: only one M code is allowed per block on this control, so M13 buys you back a block over writing M03 and M08 separately.',
 demo:sc('spindle',{dir:1, coolant:true})},

{c:'M14', f:'M', cat:'Spindle', desc:'Reverse spindle and coolant on',
 plain:'Starts the spindle counter-clockwise and turns the coolant on together.',
 blk:'S800 M14',
 tip:'The one to reach for on left-hand tapping and back-boring, where you want reverse and coolant from the same block.',
 demo:sc('spindle',{dir:-1, coolant:true})},

{c:'M15', f:'M', cat:'Spindle', desc:'Spindle stop and coolant off',
 plain:'Stops the spindle and shuts the coolant off in one word — M05 and M09 combined.',
 blk:'G00 Z1.0 M15',
 tip:'A tidy end to a tool: one block clears the spindle and the coolant before you send the axes up to the change position.',
 demo:sc('spindle',{dir:0, coolant:false})},

{c:'M19', f:'M', cat:'Spindle', desc:'Spindle Orient on',
 plain:'Turns the spindle to a fixed angular position and holds it there, so the drive key and the tool always land the same way round.',
 blk:'M19',
 tip:'This is what lets a boring bar back out without dragging: orient the spindle, shift the bar away from the wall, then retract.',
 demo:sc('spindle',{dir:0, orient:true})},

{c:'M20', f:'M', cat:'Spindle', desc:'Spindle Orient off',
 plain:'Releases the orientation hold and lets the spindle turn freely again.',
 blk:'M20',
 tip:'Leaving the spindle locked on orientation is one reason a following M03 refuses to start. If the spindle will not run, check that orientation was released.',
 demo:sc('spindle',{dir:0, orient:false})},

{c:'M21', f:'M', cat:'Mirroring', desc:'X Axis mirror image on',
 plain:'Flips the sign of every X move, so a right-hand program cuts the left-hand part without rewriting a line of it.',
 blk:'M21\nM98 P1001   (run the same part mirrored)',
 tip:'Mirroring reverses the geometry but not the spindle, so climb milling becomes conventional — and G41 now puts the cutter where G42 used to.',
 demo:sc('mirror',{ax:'x'})},

{c:'M22', f:'M', cat:'Mirroring', desc:'Y Axis mirror image on',
 plain:'The same trick about the other axis: every Y move changes sign.',
 blk:'M22\nM98 P1001',
 tip:'Turn both M21 and M22 on and the part is rotated 180°, not mirrored — two flips make a rotation. Worth proving on the screen before you cut.',
 demo:sc('mirror',{ax:'y'})},

{c:'M23', f:'M', cat:'Mirroring', desc:'Mirror image off',
 plain:'Cancels mirroring on both axes and puts the coordinate signs back the way they were written.',
 blk:'M23',
 tip:'Mirror left on is invisible on the page and obvious in the vice. Cancel it the moment the mirrored feature is finished.',
 demo:sc('mirror',{ax:'off'})},

{c:'M29', f:'M', cat:'Spindle', desc:'Rigid tap mode',
 plain:'Locks spindle rotation to Z feed, so the tap is driven down and back by the machine instead of floating in a tension‑compression holder.',
 blk:'M29 S500\nG84 X1. Y1. Z-0.5 R0.25 F25.',
 tip:'It goes in the block before the tapping cycle, not inside it. Rigid tapping also lets you tap to a shoulder and get the depth you asked for.',
 demo:sc('rigidtap')},

{c:'M30', f:'M', cat:'Program', desc:'End of program',
 plain:'Ends the program, shuts the spindle and coolant off and rewinds to the top, ready for the next part.',
 blk:'G91 G28 Z0.\nG28 X0. Y0.\nM30',
 tip:'Send the axes home before it, not after — nothing runs after M30. M02 also ends a program but does not rewind, which is why M30 is the one everybody uses.',
 demo:sc('program',{kind:'m30'})},

{c:'M51', f:'M', cat:'Coolant', desc:'Chip flush coolant on (Option)',
 plain:'Turns on the wash-down jets that sluice chips off the table and down into the conveyor. It is for housekeeping, not for cutting.',
 blk:'M51',
 tip:'Run it while a long cycle is cutting and the machine clears its own chips. Chips left to pile up around a fixture re-cut and ruin a finish.',
 demo:sc('coolant',{kind:'flush', on:true})},

{c:'M52', f:'M', cat:'Coolant', desc:'Chip flush coolant off (Option)',
 plain:'Shuts the wash-down jets off.',
 blk:'M52',
 tip:'Turn it off before the door opens unless you want a face full of coolant.',
 demo:sc('coolant',{kind:'flush', on:false})},

{c:'M53', f:'M', cat:'Coolant', desc:'Thru-spindle coolant on (Option)',
 plain:'Pumps coolant down the middle of the spindle and out through the tool, straight to the cutting edge at the bottom of the hole.',
 blk:'M53\nG83 X1. Y1. Z-2.0 Q0.25 R0.1 F5.',
 tip:'It is what makes deep drilling possible — flood coolant never reaches the point. The tool has to have a coolant hole through it, and the pressure has to be up before the drill enters.',
 demo:sc('coolant',{kind:'thru', on:true})},

{c:'M54', f:'M', cat:'Coolant', desc:'Thru-spindle coolant off (Option)',
 plain:'Shuts the through-spindle supply off.',
 blk:'M54\nG00 Z1.0',
 tip:'Turn it off before the tool change. High-pressure coolant blasting out of an open spindle taper makes a mess and can stop the next tool seating clean.',
 demo:sc('coolant',{kind:'thru', on:false})},

{c:'M68', f:'M', cat:'Machine Options', desc:'Chip conveyor on (Option)',
 plain:'Starts the conveyor that carries chips out of the machine and into the bin.',
 blk:'M68',
 tip:'Start it at the top of a long program and it keeps the machine clearing itself. Chips banked up against a fixture will eventually lift a part.',
 demo:sc('conveyor',{on:true})},

{c:'M69', f:'M', cat:'Machine Options', desc:'Chip conveyor off (Option)',
 plain:'Stops the chip conveyor.',
 blk:'M69\nM30',
 tip:'Stop it before anyone reaches in. Also stop it if you drop something small into the trough — the conveyor will find the bin before you do.',
 demo:sc('conveyor',{on:false})},

{c:'M98', f:'M', cat:'Program', desc:'Search for subprogram',
 plain:'Calls a subprogram and runs it. M98 P1001 L4 jumps to program O1001 and repeats it four times before coming back.',
 blk:'M98 P1001 L4',
 tip:'Write a repeated feature once and call it. Pair it with G91 to step to the next position, or with the extra work offsets to run the same part all over the table.',
 demo:sc('program',{kind:'m98'})},

{c:'M99', f:'M', cat:'Program', desc:'Subprogram end – return to main program',
 plain:'Ends the subprogram and hands control back to the block after the M98 that called it.',
 blk:'M99   (back to the main program)',
 tip:'Put M99 at the end of a main program instead and it loops forever. Sometimes that is what you want on a bar feeder; on a VMC it is usually a mistake.',
 demo:sc('program',{kind:'m99'})}
];

const CATS = [];
CARDS.forEach(c => { if (CATS.indexOf(c.cat) < 0) CATS.push(c.cat); });
const BY_CODE = {};
CARDS.forEach(c => { BY_CODE[c.c] = c; });

/* ---- reading a sample block, one word at a time ----------------------
   Beginners do not get stuck on what a block does so much as on which
   letter means what. So rather than composing a sentence, name every word
   in the sample and say what that word is for, in the context of its own
   line: R is an arc radius next to G02 and the retract plane inside a
   canned cycle, P is a dwell after G04 and a program number after M98. */

const LETTER = {
  X:'X axis position',  Y:'Y axis position',  Z:'Z axis position',
  A:'rotary axis, in degrees',
  F:'feed rate',        S:'spindle speed, rev/min',
  T:'tool number',      H:'tool length offset register',
  D:'cutter radius offset register',
  I:'arc centre, X from the start point',
  J:'arc centre, Y from the start point',
  K:'arc centre, Z from the start point',
  Q:'peck depth, per bite', R:'arc radius', P:'', L:'repeat count',
  B:'rotary axis, in degrees'
};
const CODE_FALLBACK = {
  G54:'work offset 1', G55:'work offset 2', G56:'work offset 3',
  G57:'work offset 4', G58:'work offset 5', G59:'work offset 6',
  G09:'exact stop, this block only'
};

/* the sheet writes descriptions for a printed table — "Circular
   interpolation : CW", "Cutter radius compensation = cancel" — which read
   oddly inline, so soften the table punctuation */
function asNote(desc){
  return String(desc)
    .replace(/\s*\(Option\)\s*$/i, '')
    .replace(/\s*:\s*/g, ', ')
    .replace(/\s*=\s*/g, ' \u2014 ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase();
}

function explainBlock(src){
  const lines = [];
  String(src).split('\n').forEach(raw => {
    const cm = raw.match(/\(([^)]*)\)/);
    const body = raw.replace(/\([^)]*\)/g, ' ');
    const words = [];
    const re = /([A-Za-z])\s*(-?\d*\.?\d+)/g;
    let m;
    while ((m = re.exec(body))) words.push({ w: m[0].replace(/\s+/g, ''), a: m[1].toUpperCase(), v: m[2] });
    if (!words.length && !cm) return;

    /* what kind of line is this? the same letter means different things */
    const gs = words.filter(x => x.a === 'G').map(x => parseFloat(x.v));
    const ms = words.filter(x => x.a === 'M').map(x => parseFloat(x.v));
    const inCycle = gs.some(g => g >= 73 && g <= 89 && g !== 80);
    const isDwell = gs.indexOf(4) >= 0;
    const isG10   = gs.indexOf(10) >= 0;
    const isCall  = ms.indexOf(98) >= 0;
    const isArc   = gs.some(g => g === 2 || g === 3);
    const isWcsP  = gs.some(g => g >= 54 && g <= 59) && !isG10 && !isCall && !inCycle;

    const parts = words.map(x => {
      const a = x.a;
      let note;
      if (a === 'G' || a === 'M'){
        const card = BY_CODE[x.w];
        note = card ? asNote(card.desc) : (CODE_FALLBACK[x.w] || null);
      }
      else if (a === 'X' && isDwell) note = 'hold this many seconds';
      else if (a === 'Z' && inCycle) note = 'depth — the bottom of the hole';
      else if (a === 'R' && inCycle) note = 'R plane — where rapid turns into feed';
      else if (a === 'P' && inCycle) note = 'dwell at the bottom';
      else if (a === 'P' && isDwell) note = 'dwell length';
      else if (a === 'P' && isCall)  note = 'which subprogram to run';
      else if (a === 'L' && isCall)  note = 'how many times to run it';
      else if (a === 'P' && isWcsP)  note = 'which of the 48 extra offsets';
      else if (a === 'P' && isG10)   note = 'which register to write';
      else if (a === 'L' && isG10)   note = 'which offset table';
      else if (a === 'R' && !isArc)  note = 'R plane';
      else if ((a === 'I' || a === 'J' || a === 'K') && !isArc) note = 'offset from the start point';
      else note = LETTER[a] || null;
      return { word: x.w, note: note };
    }).filter(x => x.note);

    lines.push({ parts: parts, comment: cm ? cm[1].trim() : null });
  });
  return lines;
}

const SHEET_NOTES = {
  G: 'G04, G10 are non-modal. Effective only in the block commanded.',
  M: 'Only one ‘M’ code allowed per program block.'
};

/* --------------------- 2 · G-CODE INTERPRETER ---------------------- */
/* Enough of Fanuc 0i-M to make the sheet's codes move: G00-G04, G17-G21,
   G28/G30, G40-G43, G54, G73-G86 canned cycles, G90/G91, G98/G99, M words. */

const HOME = { x:-0.45, y:2.15, z:1.15 };
const RAPID_SPEED = 8;

function tokenize(src){
  return src.split('\n').map((raw, i) => {
    const t = raw.replace(/\([^)]*\)/g, ' ').replace(/;.*$/, ' ');
    const words = [];
    const re = /([A-Za-z])\s*(-?\d*\.?\d+)/g;
    let m;
    while ((m = re.exec(t))) words.push([m[1].toUpperCase(), parseFloat(m[2])]);
    return { raw, i, words };
  });
}

function arcPoints(sx, sy, ex, ey, cx, cy, cw, z0, z1){
  const r = Math.hypot(sx - cx, sy - cy);
  let a0 = Math.atan2(sy - cy, sx - cx), a1 = Math.atan2(ey - cy, ex - cx);
  let sweep = a1 - a0;
  const TAU = Math.PI * 2;
  if (cw){ while (sweep > 1e-9) sweep -= TAU; if (Math.abs(sweep) < 1e-7) sweep = -TAU; }
  else   { while (sweep < -1e-9) sweep += TAU; if (Math.abs(sweep) < 1e-7) sweep = TAU; }
  const n = Math.max(10, Math.ceil(Math.abs(sweep) / 0.1));
  const pts = [];
  for (let i = 0; i <= n; i++){
    const a = a0 + sweep * i / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * i / n]);
  }
  return pts;
}

function polyLen(p){
  let L = 0;
  for (let i = 1; i < p.length; i++)
    L += Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1], p[i][2]-p[i-1][2]);
  return L;
}

function runProgram(src){
  const lines = tokenize(src);
  const segs = [];
  const st = { x:0, y:0, z:0, abs:true, motion:0, f:10, s:0, spin:0, cool:0,
               tool:1, units:'in', plane:17, ret:98, cyc:null, comp:0, tlo:false,
               wcs:'G54', mirror:'', orient:false, rigid:false, ended:false };
  let err = '', usedHome = false, planes = null;

  const snap = () => ({ f:st.f, s:st.s, spin:st.spin, cool:st.cool, tool:st.tool,
                        units:st.units, comp:st.comp, tlo:st.tlo, wcs:st.wcs,
                        abs:st.abs, ret:st.ret, cyc: st.cyc ? st.cyc.g : 0 });

  function emit(t, pts, line, note, dur){
    const len = polyLen(pts);
    if (t !== 'dwell' && len < 1e-7) return;
    let d = dur;
    if (d == null){
      const sp = t === 'rapid' ? RAPID_SPEED : Math.max(0.45, 0.55 + st.f * 0.03);
      d = len / sp;
    }
    segs.push({ t, p: pts, line, len, dur: Math.max(0.03, d), note: note || '', st: snap() });
  }

  function cycleAt(tx, ty, line){
    const c = st.cyc, g = c.g, tap = (g === 84 || g === 74);
    emit('rapid', [[st.x, st.y, st.z], [tx, ty, st.z]], line);
    st.x = tx; st.y = ty;
    if (Math.abs(st.z - c.r) > 1e-9){ emit('rapid', [[tx, ty, st.z], [tx, ty, c.r]], line, 'to R plane'); st.z = c.r; }
    const bot = c.z, q = Math.abs(c.q) || 0.2;

    if (g === 81){
      emit('feed', [[tx, ty, c.r], [tx, ty, bot]], line, 'drill to depth');
    } else if (g === 82){
      emit('feed', [[tx, ty, c.r], [tx, ty, bot]], line, 'drill to depth');
      emit('dwell', [[tx, ty, bot]], line, 'dwell at bottom', Math.min(1.4, (c.p || 600) / 1000));
    } else if (g === 83 || g === 73){
      const hop = 0.06;
      let deep = c.r, z = c.r, first = true;
      let guard = 0;
      while (deep > bot + 1e-9 && guard++ < 60){
        const target = Math.max(bot, deep - q);
        if (g === 83 && !first){
          emit('rapid', [[tx, ty, c.r], [tx, ty, deep + hop]], line, 'back to last depth');
          z = deep + hop;
        }
        emit('feed', [[tx, ty, z], [tx, ty, target]], line, 'peck');
        z = target; deep = target; first = false;
        if (deep > bot + 1e-9){
          if (g === 83){ emit('rapid', [[tx, ty, z], [tx, ty, c.r]], line, 'full retract — clear the chip'); z = c.r; }
          else { emit('rapid', [[tx, ty, z], [tx, ty, z + hop]], line, 'break the chip, stay in the hole'); z += hop; }
        }
      }
    } else if (tap){
      emit('feed', [[tx, ty, c.r], [tx, ty, bot]], line, g === 84 ? 'tap in, spindle forward' : 'tap in, spindle reverse');
      emit('dwell', [[tx, ty, bot]], line, 'spindle reverses', 0.35);
      emit('feed', [[tx, ty, bot], [tx, ty, c.r]], line, 'feed back out');
      st.z = c.r;
    } else if (g === 86){
      emit('feed', [[tx, ty, c.r], [tx, ty, bot]], line, 'bore to depth');
      emit('dwell', [[tx, ty, bot]], line, 'spindle stop', 0.35);
      emit('rapid', [[tx, ty, bot], [tx, ty, c.r]], line, 'rapid out — leaves a witness line');
      st.z = c.r;
    }
    if (!tap && g !== 86) st.z = bot;

    const retZ = st.ret === 99 ? c.r : c.init;
    if (Math.abs(st.z - retZ) > 1e-9){
      emit('rapid', [[tx, ty, st.z], [tx, ty, retZ]], line, st.ret === 99 ? 'retract to R plane (G99)' : 'retract to initial point (G98)');
      st.z = retZ;
    }
    planes = { r: c.r, init: c.init, z: c.z };
  }

  for (const ln of lines){
    if (!ln.words.length || st.ended) continue;
    const W = {};
    const gs = [], ms = [];
    for (const [a, v] of ln.words){
      if (a === 'G') gs.push(v);
      else if (a === 'M') ms.push(v);
      else W[a] = v;
    }
    let motionThisBlock = null, ref = 0;

    for (const g of gs){
      const n = Math.round(g);
      if (n === 0 || n === 1 || n === 2 || n === 3){ st.motion = n; motionThisBlock = n; }
      else if (n === 4) motionThisBlock = 4;
      else if (n === 17 || n === 18 || n === 19) st.plane = n;
      else if (n === 20) st.units = 'in';
      else if (n === 21) st.units = 'mm';
      else if (n === 28 || n === 30) ref = n;
      else if (n === 40) st.comp = 0;
      else if (n === 41) st.comp = -1;
      else if (n === 42) st.comp = 1;
      else if (n === 43) st.tlo = true;
      else if (n === 49) st.tlo = false;
      else if (n >= 54 && n <= 59) st.wcs = 'G' + n;
      else if (n === 80){ st.cyc = null; motionThisBlock = 80; }
      else if (n === 90) st.abs = true;
      else if (n === 91) st.abs = false;
      else if (n === 98 || n === 99) st.ret = n;
      else if ([73,74,81,82,83,84,86].indexOf(n) >= 0){
        st.cyc = { g:n, z:0, r:0, q:0, p:0, init: st.z };
        motionThisBlock = 'cyc';
      }
    }
    for (const m of ms){
      const n = Math.round(m);
      if (n === 3) st.spin = 1; else if (n === 4) st.spin = -1; else if (n === 5) st.spin = 0;
      else if (n === 8) st.cool = 1; else if (n === 9) st.cool = 0;
      else if (n === 13){ st.spin = 1; st.cool = 1; } else if (n === 14){ st.spin = -1; st.cool = 1; }
      else if (n === 15){ st.spin = 0; st.cool = 0; }
      else if (n === 19) st.orient = true; else if (n === 20) st.orient = false;
      else if (n === 29) st.rigid = true;
      else if (n === 53) st.cool = 2; else if (n === 54) st.cool = 0;
      else if (n === 6) emit('dwell', [[st.x, st.y, st.z]], ln.i, 'tool change', 0.4);
      else if (n === 30 || n === 2) st.ended = true;
    }
    if ('F' in W) st.f = W.F;
    if ('S' in W) st.s = W.S;
    if ('T' in W) st.tool = W.T;

    const has = k => (k in W);
    const tgt = k => {
      const cur = k === 'X' ? st.x : k === 'Y' ? st.y : st.z;
      if (!has(k)) return cur;
      return st.abs ? W[k] : cur + W[k];
    };

    if (ref){                                       /* G28 / G30 */
      usedHome = true;
      const inter = [ has('X') ? tgt('X') : st.x, has('Y') ? tgt('Y') : st.y, has('Z') ? tgt('Z') : st.z ];
      emit('rapid', [[st.x, st.y, st.z], inter], ln.i, 'via the intermediate point');
      const home = [ has('X') ? HOME.x : inter[0], has('Y') ? HOME.y : inter[1], has('Z') ? HOME.z : inter[2] ];
      emit('rapid', [inter, home], ln.i, ref === 28 ? 'to machine zero' : 'to the tool change point');
      st.x = home[0]; st.y = home[1]; st.z = home[2];
      continue;
    }
    if (motionThisBlock === 4){                     /* G04 dwell */
      emit('dwell', [[st.x, st.y, st.z]], ln.i, 'dwell', Math.min(1.5, ('X' in W ? W.X : ('P' in W ? W.P / 1000 : 1))));
      continue;
    }
    if (motionThisBlock === 'cyc'){                 /* canned cycle block */
      const c = st.cyc;
      c.z = st.abs ? (has('Z') ? W.Z : 0) : st.z + (W.Z || 0);
      c.r = st.abs ? (has('R') ? W.R : 0) : st.z + (W.R || 0);
      c.q = W.Q || 0; c.p = W.P || 0; if ('F' in W) st.f = W.F;
      cycleAt(tgt('X'), tgt('Y'), ln.i);
      continue;
    }
    if (st.cyc && (has('X') || has('Y'))){          /* repeat the cycle */
      cycleAt(tgt('X'), tgt('Y'), ln.i);
      continue;
    }
    if (!has('X') && !has('Y') && !has('Z')) continue;

    const nx = tgt('X'), ny = tgt('Y'), nz = tgt('Z');
    const mode = motionThisBlock != null && motionThisBlock !== 80 ? motionThisBlock : st.motion;
    if (mode === 2 || mode === 3){
      let cx, cy;
      if (has('I') || has('J')){ cx = st.x + (W.I || 0); cy = st.y + (W.J || 0); }
      else if (has('R')){
        const dx = nx - st.x, dy = ny - st.y, d = Math.hypot(dx, dy), R = Math.abs(W.R);
        if (d < 1e-9 || R < d / 2){ err = 'Line ' + (ln.i + 1) + ': that R cannot reach the endpoint.'; continue; }
        const h = Math.sqrt(R * R - d * d / 4), sgn = ((mode === 2) === (W.R > 0)) ? -1 : 1;
        cx = st.x + dx / 2 + sgn * h * (-dy / d); cy = st.y + dy / 2 + sgn * h * (dx / d);
      } else { err = 'Line ' + (ln.i + 1) + ': an arc needs I and J, or R.'; continue; }
      const r1 = Math.hypot(st.x - cx, st.y - cy), r2 = Math.hypot(nx - cx, ny - cy);
      if (Math.abs(r1 - r2) > 0.02) err = 'Line ' + (ln.i + 1) + ': start and end are not the same radius from the centre.';
      emit('feed', arcPoints(st.x, st.y, nx, ny, cx, cy, mode === 2, st.z, nz), ln.i, mode === 2 ? 'arc CW' : 'arc CCW');
    } else {
      emit(mode === 0 ? 'rapid' : 'feed', [[st.x, st.y, st.z], [nx, ny, nz]], ln.i);
    }
    st.x = nx; st.y = ny; st.z = nz;
  }

  let total = 0;
  segs.forEach(s => { s.t0 = total; total += s.dur; s.t1 = total; });
  if (total > 0 && total < 1.2){ const k = 1.2 / total; segs.forEach(s => { s.t0 *= k; s.t1 *= k; s.dur *= k; }); total = 1.2; }
  if (total > 16){ const k = 16 / total; segs.forEach(s => { s.t0 *= k; s.t1 *= k; s.dur *= k; }); total = 16; }
  return { segs, total, err, usedHome, planes, lines };
}

/* point along a segment at local fraction u */
function segPoint(s, u){
  if (s.t === 'dwell') return s.p[0];
  const target = s.len * u;
  let acc = 0;
  for (let i = 1; i < s.p.length; i++){
    const a = s.p[i-1], b = s.p[i];
    const d = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    if (acc + d >= target || i === s.p.length - 1){
      const k = d < 1e-12 ? 1 : (target - acc) / d;
      return [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k];
    }
    acc += d;
  }
  return s.p[s.p.length - 1] || s.p[0] || [0, 0, 0];
}

/* ----------------------- 3 · CANVAS RENDERERS ---------------------- */
/* The viewport is a CAM screen: same dark palette in every page theme. */

const VP = { bg:'#0C0F0D', grid:'#171D17', grid2:'#232B22', ink:'#9AA598', ink2:'#616B60',
             edge:'#2C352B', rapid:'#E8564A', feed:'#3FC2B0', tool:'#F2B33D',
             part:'#1E2A32', partLine:'#6F8B99', note:'#C9B078', white:'#DFE6DC',
             /* labels sit on a plate of this, so they never fight the art behind */
             plate:'rgba(8,11,9,.9)' };

/* one type scale for every schematic, in schematic units (the box is 100x75) */
const TYPE = { title:3.5, label:3.0, value:3.2, small:2.7, caption:3.15 };

function roundRectPath(g, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y,     x + w, y + h, r);
  g.arcTo(x + w, y + h, x,     y + h, r);
  g.arcTo(x,     y + h, x,     y,     r);
  g.arcTo(x,     y,     x + w, y,     r);
  g.closePath();
}

class Pad {
  constructor(cv){ this.cv = cv; this.g = cv.getContext('2d'); this.w = 0; this.h = 0; this.s = 1; }
  fitPixels(){
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)){
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    }
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    return w > 4 && h > 4;
  }
  setWorld(a0, a1, b0, b1, pad){
    pad = pad == null ? 22 : pad;
    const da = Math.max(a1 - a0, 1e-6), db = Math.max(b1 - b0, 1e-6);
    this.s = Math.min((this.w - pad * 2) / da, (this.h - pad * 2) / db);
    this.ox = this.w / 2 - (a0 + a1) / 2 * this.s;
    this.oy = this.h / 2 + (b0 + b1) / 2 * this.s;
  }
  X(a){ return this.ox + a * this.s; }
  Y(b){ return this.oy - b * this.s; }
  clear(){ const g = this.g; g.fillStyle = VP.bg; g.fillRect(0, 0, this.w, this.h); }
  txt(s, x, y, col, size, align, weight){
    const g = this.g;
    g.font = (weight || 500) + ' ' + (size || 10) + 'px "IBM Plex Mono", monospace';
    g.fillStyle = col; g.textAlign = align || 'left'; g.textBaseline = 'middle';
    g.fillText(s, x, y);
  }
  line(x1, y1, x2, y2, col, w, dash){
    const g = this.g;
    g.save(); g.strokeStyle = col; g.lineWidth = w || 1; g.setLineDash(dash || []);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
  }
  /* a label on its own plate, so a plane line and the top of the part can
     land at the same height without turning into soup */
  tag(str, x, y, col, align, size){
    const g = this.g, fs = size || 10, padX = 5, padY = 3.5;
    g.save();
    g.font = '600 ' + fs + 'px "IBM Plex Mono", monospace';
    const bw = g.measureText(str).width + padX * 2, bh = fs + padY * 2;
    const left = align === 'right' ? x - bw : align === 'center' ? x - bw / 2 : x;
    roundRectPath(g, left, y - bh / 2, bw, bh, 3);
    g.fillStyle = VP.plate; g.fill();
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(str, left + padX, y);
    g.restore();
    return bw;
  }
}

function niceStep(scale){
  const steps = [0.05, 0.1, 0.25, 0.5, 1, 2, 5];
  for (const s of steps) if (s * scale >= 24) return s;
  return 10;
}

function drawGrid(pad, a0, a1, b0, b1){
  const g = pad.g, step = niceStep(pad.s);
  g.save(); g.lineWidth = 1;
  for (let a = Math.ceil(a0 / step) * step; a <= a1; a += step){
    const major = Math.abs(a / (step * 4) - Math.round(a / (step * 4))) < 1e-6;
    g.strokeStyle = major ? VP.grid2 : VP.grid;
    g.beginPath(); g.moveTo(Math.round(pad.X(a)) + .5, 0); g.lineTo(Math.round(pad.X(a)) + .5, pad.h); g.stroke();
  }
  for (let b = Math.ceil(b0 / step) * step; b <= b1; b += step){
    const major = Math.abs(b / (step * 4) - Math.round(b / (step * 4))) < 1e-6;
    g.strokeStyle = major ? VP.grid2 : VP.grid;
    g.beginPath(); g.moveTo(0, Math.round(pad.Y(b)) + .5); g.lineTo(pad.w, Math.round(pad.Y(b)) + .5); g.stroke();
  }
  g.restore();
}

/* the standard work-coordinate symbol: circle, two quadrants filled */
function drawOrigin(pad, x, y, r){
  const g = pad.g;
  r = r || 7;
  g.save();
  g.translate(x, y);
  g.fillStyle = VP.ink2;
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, -Math.PI / 2, 0); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, Math.PI / 2, Math.PI); g.closePath(); g.fill();
  g.strokeStyle = VP.ink2; g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  g.restore();
}

function drawHome(pad, x, y){
  const g = pad.g;
  g.save(); g.translate(x, y); g.strokeStyle = VP.note; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(-7, 2); g.lineTo(0, -5); g.lineTo(7, 2); g.moveTo(-5, 1); g.lineTo(-5, 7);
  g.lineTo(5, 7); g.lineTo(5, 1); g.stroke(); g.restore();
}

function partialPoly(s, frac){
  if (frac >= 1) return s.p;
  if (frac <= 0 || s.len < 1e-9) return [s.p[0]];
  const target = s.len * frac, out = [s.p[0]];
  let acc = 0;
  for (let i = 1; i < s.p.length; i++){
    const a = s.p[i-1], b = s.p[i];
    const d = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    if (acc + d >= target){
      const k = d < 1e-12 ? 0 : (target - acc) / d;
      out.push([a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k]);
      return out;
    }
    acc += d; out.push(b);
  }
  return out;
}

function strokeSeg(pad, s, pts, plane, alpha, width){
  if (pts.length < 2) return;
  const g = pad.g;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = s.t === 'rapid' ? VP.rapid : VP.feed;
  g.lineWidth = width;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.setLineDash(s.t === 'rapid' ? [5, 4] : []);
  g.beginPath();
  for (let i = 0; i < pts.length; i++){
    const a = pts[i][0], b = plane === 'xy' ? pts[i][1] : pts[i][2];
    if (i === 0) g.moveTo(pad.X(a), pad.Y(b)); else g.lineTo(pad.X(a), pad.Y(b));
  }
  g.stroke(); g.restore();
}

function drawTool(pad, p, plane, cutting){
  const g = pad.g;
  const x = pad.X(p[0]), y = pad.Y(plane === 'xy' ? p[1] : p[2]);
  g.save();
  if (plane === 'xy'){
    const r = Math.max(5, Math.min(16, 0.1 * pad.s));
    g.strokeStyle = VP.tool; g.lineWidth = 1.6; g.fillStyle = 'rgba(242,179,61,.16)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - r - 4, y); g.lineTo(x + r + 4, y);
    g.moveTo(x, y - r - 4); g.lineTo(x, y + r + 4); g.lineWidth = 1; g.stroke();
  } else {
    const w = Math.max(4, Math.min(13, 0.11 * pad.s));
    g.fillStyle = VP.tool; g.strokeStyle = VP.tool; g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x - w / 2, y - w * 0.8); g.lineTo(x - w / 2, y - w * 5.5);
    g.lineTo(x + w / 2, y - w * 5.5); g.lineTo(x + w / 2, y - w * 0.8); g.closePath();
    g.globalAlpha = .88; g.fill(); g.globalAlpha = 1;
    if (cutting){
      g.strokeStyle = 'rgba(242,179,61,.5)'; g.lineWidth = 1;
      g.beginPath(); g.arc(x, y, w * 1.5, 0, Math.PI * 2); g.stroke();
    }
  }
  g.restore();
}

function drawStock(pad, stock, plane){
  if (!stock || plane !== 'xz') return;
  const g = pad.g;
  const x0 = pad.X(stock[0]), x1 = pad.X(stock[2]), y0 = pad.Y(0), y1 = pad.Y(stock[3]);
  g.save();
  g.fillStyle = VP.part; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = VP.partLine; g.lineWidth = 1.3;
  g.strokeRect(Math.round(x0) + .5, Math.round(y0) + .5, Math.round(x1 - x0), Math.round(y1 - y0));
  g.restore();

}

/* --- draws one interpreted program into one pad at time tNow --- */
function renderRun(pad, run, plane, tNow, stock, opts){
  opts = opts || {};
  if (!pad.fitPixels()) return;
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
  const add = (a, b) => { a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); };
  run.segs.forEach(s => s.p.forEach(p => add(p[0], plane === 'xy' ? p[1] : p[2])));
  add(0, 0);
  if (stock && plane === 'xz'){ add(stock[0], 0); add(stock[2], stock[3]); }
  if (!isFinite(a0)){ a0 = 0; a1 = 1; b0 = 0; b1 = 1; }
  const ma = Math.max((a1 - a0) * 0.12, 0.08), mb = Math.max((b1 - b0) * 0.12, 0.08);
  a0 -= ma; a1 += ma; b0 -= mb; b1 += mb;
  pad.setWorld(a0, a1, b0, b1, 16);

  pad.clear();
  drawGrid(pad, a0, a1, b0, b1);
  pad.line(0, pad.Y(0), pad.w, pad.Y(0), VP.edge, 1.2);
  pad.line(pad.X(0), 0, pad.X(0), pad.h, VP.edge, 1.2);
  drawStock(pad, stock, plane);

  if (plane === 'xz' && run.planes){
    const pl = run.planes;
    pad.line(0, pad.Y(pl.r), pad.w, pad.Y(pl.r), VP.note, 1, [3, 4]);
    pad.tag('R plane', pad.w - 5, pad.Y(pl.r), VP.note, 'right', 9.5);
    if (Math.abs(pl.init - pl.r) > 0.02){
      pad.line(0, pad.Y(pl.init), pad.w, pad.Y(pl.init), VP.note, 1, [3, 4]);
      pad.tag('initial point', pad.w - 5, pad.Y(pl.init), VP.note, 'right', 9.5);
    }
  }

  run.segs.forEach(s => strokeSeg(pad, s, s.p, plane, 0.22, 1.4));
  let cur = null, curSeg = null;
  for (const s of run.segs){
    if (s.t1 <= tNow){ strokeSeg(pad, s, s.p, plane, 1, 2); }
    else if (s.t0 < tNow){
      const u = (tNow - s.t0) / s.dur;
      strokeSeg(pad, s, partialPoly(s, u), plane, 1, 2);
      cur = segPoint(s, u); curSeg = s;
    }
  }
  if (!cur && run.segs.length){
    const last = run.segs[run.segs.length - 1];
    cur = tNow >= last.t1 ? last.p[last.p.length - 1] : run.segs[0].p[0];
    curSeg = tNow >= last.t1 ? last : run.segs[0];
  }
  drawOrigin(pad, pad.X(0), pad.Y(0), 7);
  if (run.usedHome) drawHome(pad, pad.X(plane === 'xy' ? HOME.x : HOME.x), pad.Y(plane === 'xy' ? HOME.y : HOME.z));
  if (cur) drawTool(pad, cur, plane, curSeg && curSeg.t === 'feed');

  /* name the top face at whichever end of it the tool is not standing on */
  if (stock && plane === 'xz'){
    const sx0 = pad.X(stock[0]), sx1 = pad.X(stock[2]), sy0 = pad.Y(0);
    const tx = cur ? pad.X(cur[0]) : -1e9;
    if (Math.abs(tx - (sx0 + 20)) > 40) pad.tag('Z0', sx0 + 6, sy0, VP.partLine, 'left', 9.5);
    else                                pad.tag('Z0', sx1 - 6, sy0, VP.partLine, 'right', 9.5);
  }

  if (curSeg && curSeg.note && opts.notes !== false)
    pad.tag(curSeg.note, pad.w / 2, pad.h - 13, VP.note, 'center', 10.5);
  if (opts.corner) pad.tag(opts.corner, pad.w - 6, 13, VP.ink2, 'right', 9.5);
  return { cur, curSeg };
}

/* -------------------------- 4 · SCHEMATICS ------------------------- */
/* A 100 x 75 design space letterboxed into the pad, so every painter
   below can place things by eye in the same units. */

function design(pad){
  const g = pad.g;
  const s = Math.min(pad.w / 100, pad.h / 75);
  const ox = (pad.w - 100 * s) / 2, oy = (pad.h - 75 * s) / 2;
  const X = u => ox + u * s, Y = v => oy + v * s, L = u => u * s;
  const D = { g, s, X, Y, L,
    line(x1, y1, x2, y2, col, w, dash){
      g.save(); g.strokeStyle = col; g.lineWidth = L(w == null ? .5 : w);
      g.setLineDash((dash || []).map(L)); g.lineCap = 'round';
      g.beginPath(); g.moveTo(X(x1), Y(y1)); g.lineTo(X(x2), Y(y2)); g.stroke(); g.restore();
    },
    rect(x, y, w, h, fill, stroke, sw, dash){
      g.save(); g.setLineDash((dash || []).map(L));
      if (fill){ g.fillStyle = fill; g.fillRect(X(x), Y(y), L(w), L(h)); }
      if (stroke){ g.strokeStyle = stroke; g.lineWidth = L(sw == null ? .5 : sw); g.strokeRect(X(x), Y(y), L(w), L(h)); }
      g.restore();
    },
    circle(x, y, r, fill, stroke, sw, dash){
      g.save(); g.setLineDash((dash || []).map(L));
      g.beginPath(); g.arc(X(x), Y(y), L(r), 0, Math.PI * 2);
      if (fill){ g.fillStyle = fill; g.fill(); }
      if (stroke){ g.strokeStyle = stroke; g.lineWidth = L(sw == null ? .5 : sw); g.stroke(); }
      g.restore();
    },
    poly(pts, col, w, dash, fill, close){
      g.save(); g.setLineDash((dash || []).map(L)); g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])));
      if (close) g.closePath();
      if (fill){ g.fillStyle = fill; g.fill(); }
      if (col){ g.strokeStyle = col; g.lineWidth = L(w == null ? .5 : w); g.stroke(); }
      g.restore();
    },
    text(str, x, y, col, size, align, weight, mono, maxW){
      g.save();
      g.font = (weight || 500) + ' ' + Math.max(8, L(size == null ? 3.4 : size)) + 'px ' +
        (mono === false ? '"Archivo", sans-serif' : '"IBM Plex Mono", monospace');
      g.fillStyle = col; g.textAlign = align || 'left'; g.textBaseline = 'middle';
      if (maxW == null) g.fillText(str, X(x), Y(y));
      else g.fillText(str, X(x), Y(y), L(maxW));
      g.restore();
    },
    arrow(x1, y1, x2, y2, col, w, head){
      const hx = X(x2), hy = Y(y2), a = Math.atan2(Y(y2) - Y(y1), X(x2) - X(x1));
      const hl = L(head == null ? 3 : head);
      D.line(x1, y1, x2, y2, col, w);
      g.save(); g.fillStyle = col; g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx - hl * Math.cos(a - .42), hy - hl * Math.sin(a - .42));
      g.lineTo(hx - hl * Math.cos(a + .42), hy - hl * Math.sin(a + .42));
      g.closePath(); g.fill(); g.restore();
    },
    arcArrow(cx, cy, r, a0, a1, col, w, head){
      g.save(); g.strokeStyle = col; g.lineWidth = L(w == null ? .7 : w); g.lineCap = 'round';
      g.beginPath(); g.arc(X(cx), Y(cy), L(r), a0, a1, a1 < a0); g.stroke(); g.restore();
      const dir = a1 < a0 ? -1 : 1, ta = a1 + dir * .02;
      const hx = X(cx) + L(r) * Math.cos(ta), hy = Y(cy) + L(r) * Math.sin(ta);
      const a = ta + dir * Math.PI / 2, hl = L(head == null ? 3.2 : head);
      g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(hx, hy);
      g.lineTo(hx - hl * Math.cos(a - .42), hy - hl * Math.sin(a - .42));
      g.lineTo(hx - hl * Math.cos(a + .42), hy - hl * Math.sin(a + .42));
      g.closePath(); g.fill(); g.restore();
    },
    /* --- measuring, so nothing has to be condensed or guessed at --- */
    measure(str, size, weight, mono){
      g.save();
      g.font = (weight || 500) + ' ' + Math.max(8, L(size == null ? TYPE.label : size)) + 'px ' +
        (mono === false ? '"Archivo", sans-serif' : '"IBM Plex Mono", monospace');
      const w = g.measureText(String(str)).width;
      g.restore();
      return w / s;                                    /* px back into units */
    },
    wrap(str, maxW, size, weight, mono){
      const words = String(str).split(' ');
      const lines = [];
      let cur = '';
      for (const wd of words){
        const t = cur ? cur + ' ' + wd : wd;
        if (cur && D.measure(t, size, weight, mono) > maxW){ lines.push(cur); cur = wd; }
        else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    },
    panel(x, y, w, h, fill, stroke, r){
      g.save();
      roundRectPath(g, X(x), Y(y), L(w), L(h), L(r == null ? 1.4 : r));
      if (fill){ g.fillStyle = fill; g.fill(); }
      if (stroke){ g.strokeStyle = stroke; g.lineWidth = L(.4); g.stroke(); }
      g.restore();
    },
    /* a label on its own plate — readable over a grid, a part, anything */
    chip(str, x, y, o){
      o = o || {};
      const size = o.size == null ? TYPE.label : o.size;
      const weight = o.weight || 600, mono = o.mono !== false;
      const padX = o.padX == null ? 1.5 : o.padX;
      const w = D.measure(str, size, weight, mono) + padX * 2, h = size * 2.05;
      const align = o.align || 'center';
      const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      D.panel(left, y - h / 2, w, h, o.bg === null ? null : (o.bg || VP.plate), o.border || null, o.r);
      D.text(str, left + padX, y, o.col || VP.ink, size, 'left', weight, mono);
      return { w, h, left, right: left + w };
    },
    /* a key, for the diagrams that carry more than one colour */
    key(items, y, col){
      const size = TYPE.small, gap = 2.2, sw = 3.4;
      const widths = items.map(it => sw + 1.2 + D.measure(it[1], size, 600, true));
      const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
      let x = 50 - total / 2;
      items.forEach((it, i) => {
        D.line(x, y, x + sw, y, it[0], .8);
        D.text(it[1], x + sw + 1.2, y, col || VP.ink2, size, 'left', 600);
        x += widths[i] + gap;
      });
    },
    /* the heading band across the top of every schematic */
    title(str){
      const lines = D.wrap(str, 88, TYPE.title, 700).slice(0, 1);
      D.text(lines[0], 50, 5.4, VP.ink, TYPE.title, 'center', 700, true, 90);
      D.line(5, 9.8, 95, 9.8, VP.edge, .3);
    },
    /* the caption band across the bottom: wraps to two lines rather than
       squeezing one line of condensed type edge to edge */
    caption(str, col){
      const size = TYPE.caption;
      const lines = D.wrap(str, 88, size, 500).slice(0, 2);
      const top = lines.length > 1 ? 65.8 : 68.2;
      D.panel(2, top, 96, 74 - top, VP.plate, null, 1.2);
      const y0 = lines.length > 1 ? 68.4 : 71.0;
      lines.forEach((ln, i) => D.text(ln, 50, y0 + i * 4.1, col || VP.note, size, 'center', 500));
    }
  };
  return D;
}

const easeHold = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

const SCHEM = {

/* --- G04 : dwell --- */
dwell(D, t){
  D.title('G04 — TOOL HOLDS, SPINDLE TURNS');
  D.rect(18, 34, 64, 26, VP.part, VP.partLine, .6);
  D.text('Z0', 16, 34, VP.partLine, 3, 'right');
  const inHole = easeHold(t, .1, .32), out = easeHold(t, .78, .95);
  const zTop = 20, zBot = 42;
  const z = zTop + (zBot - zTop) * inHole - (zBot - zTop) * out;
  D.rect(46, 34, 8, 12, VP.bg, null);
  D.poly([[46, 30], [46, z], [50, z + 3], [54, z], [54, 30]], VP.tool, .7, null, 'rgba(242,179,61,.8)', true);
  const dwelling = t > .34 && t < .76;
  if (dwelling){
    const k = easeHold(t, .34, .76);
    D.circle(74, 22, 9, null, VP.ink2, .5);
    D.g.save();
    D.g.beginPath(); D.g.moveTo(D.X(74), D.Y(22));
    D.g.arc(D.X(74), D.Y(22), D.L(9), -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    D.g.closePath(); D.g.fillStyle = 'rgba(201,176,120,.45)'; D.g.fill(); D.g.restore();
    D.text((1.5 * k).toFixed(1) + 's', 74, 22, VP.note, 3.2, 'center', 600);
    D.arcArrow(50, 24, 5.5, -2.4, .7, VP.feed, .6, 2.6);
    D.caption('G04 X1.5  — wiping the bottom of the bore clean');
  } else {
    D.caption(t < .34 ? 'feed to depth' : 'retract');
  }
},

/* --- G10 : offset entry from the program --- */
offsets(D, t){
  D.title('G10 — THE PROGRAM WRITES THE OFFSET PAGE');
  D.rect(6, 14, 40, 15, 'rgba(63,194,176,.08)', VP.edge, .5);
  D.text('G10 L2 P1', 9, 20, VP.feed, 3.4);
  D.text('X-12.5 Y-6.25', 9, 25.5, VP.white, 3.2);
  D.rect(56, 12, 38, 48, 'rgba(255,255,255,.02)', VP.edge, .5);
  D.text('WORK OFFSET', 75, 17, VP.ink, TYPE.small, 'center', 700);
  D.line(56, 20, 94, 20, VP.edge, .4);
  D.text('X', 79, 24, VP.ink2, TYPE.small, 'right', 600);
  D.text('Y', 93, 24, VP.ink2, TYPE.small, 'right', 600);
  const rows = [['G54', '-12.500', '-6.250'], ['G55', '-4.200', '-9.100'], ['G56', '0.000', '0.000']];
  const hit = t > .55;
  rows.forEach((r, i) => {
    const y = 31 + i * 9, on = i === 0 && hit;
    if (on) D.rect(57, y - 4, 36, 8, 'rgba(242,179,61,.16)', null);
    D.text(r[0], 59, y, on ? VP.tool : VP.ink, TYPE.value, 'left', 600);
    D.text(i === 0 && !hit ? '0.000' : r[1], 79, y, on ? VP.tool : VP.white, TYPE.value, 'right');
    D.text(i === 0 && !hit ? '0.000' : r[2], 93, y, on ? VP.tool : VP.white, TYPE.value, 'right');
  });
  const p = easeHold(t, .18, .55);
  if (p > 0 && p < 1) D.arrow(47, 22, 47 + 8 * p, 22 + 9 * p, VP.tool, .6);
  else if (hit) D.arrow(47, 22, 55, 31, VP.tool, .6);
  D.caption(hit ? 'register written — it overwrites what was typed in' : 'non-modal: this block only');
},

/* --- G15 / G16 : polar --- */
polar(D, t, o){
  D.title(o.on ? 'G16 — RADIUS AND ANGLE' : 'G15 — PLAIN X AND Y');
  const cx = 50, cy = 38, R = 22;
  D.circle(cx, cy, R, null, VP.edge, .45, [2, 2]);
  D.line(cx - 30, cy, cx + 30, cy, VP.grid2, .4);
  D.line(cx, cy - 28, cx, cy + 28, VP.grid2, .4);
  const holes = [0, 60, 120, 180, 240, 300];
  const lit = Math.floor(t * 6) % 6;
  holes.forEach((a, i) => {
    const rad = -a * Math.PI / 180;
    const hx = cx + R * Math.cos(rad), hy = cy + R * Math.sin(rad);
    const on = i === lit;
    D.circle(hx, hy, on ? 3.2 : 2.4, on ? 'rgba(242,179,61,.9)' : 'rgba(111,139,153,.5)', on ? VP.tool : VP.partLine, .5);
    if (o.on && on){
      D.line(cx, cy, hx, hy, VP.feed, .7);
      D.arcArrow(cx, cy, 8, 0, rad || -.01, VP.feed, .5, 2.4);
      D.text('X1.5  Y' + a + '.', cx + 2, cy + 12, VP.feed, 3.4);
    }
    if (!o.on && on){
      D.line(cx, cy, hx, cy, VP.rapid, .5, [2, 2]);
      D.line(hx, cy, hx, hy, VP.rapid, .5, [2, 2]);
      D.text('X' + (1.5 * Math.cos(rad)).toFixed(3) + '  Y' + (-1.5 * Math.sin(rad)).toFixed(3), cx, cy + 14, VP.rapid, 3.1, 'center');
    }
  });
  D.circle(cx, cy, 1.6, VP.ink2, null);
  D.caption(o.on ? 'set the radius once, then step the angle' : 'every hole is its own bit of trigonometry');
},

/* --- G17 / G18 / G19 : plane selection --- */
planes(D, t, o){
  const p = o.p;
  D.title('G' + p + ' — ' + (p === 17 ? 'XY' : p === 18 ? 'ZX' : 'ZY') + ' PLANE');
  const O = [42, 44], ux = [20, 0], uy = [11, -7], uz = [0, -22];
  const P = (a, b, c) => [O[0] + ux[0] * a + uy[0] * b + uz[0] * c, O[1] + ux[1] * a + uy[1] * b + uz[1] * c];
  const faceXY = [P(0,0,0), P(1,0,0), P(1,1,0), P(0,1,0)];
  const faceZX = [P(0,0,0), P(1,0,0), P(1,0,1), P(0,0,1)];
  const faceZY = [P(0,0,0), P(0,1,0), P(0,1,1), P(0,0,1)];
  const on = 'rgba(63,194,176,.22)', off = 'rgba(255,255,255,.03)';
  D.poly(faceZY, p === 19 ? VP.feed : VP.edge, p === 19 ? .7 : .4, null, p === 19 ? on : off, true);
  D.poly(faceZX, p === 18 ? VP.feed : VP.edge, p === 18 ? .7 : .4, null, p === 18 ? on : off, true);
  D.poly(faceXY, p === 17 ? VP.feed : VP.edge, p === 17 ? .7 : .4, null, p === 17 ? on : off, true);
  const c = p === 17 ? P(.5,.5,0) : p === 18 ? P(.5,0,.5) : P(0,.5,.5);
  const ang = -Math.PI / 2 + t * Math.PI * 2;
  D.g.save(); D.g.strokeStyle = VP.tool; D.g.lineWidth = D.L(.8); D.g.setLineDash([D.L(2), D.L(2)]);
  D.g.beginPath(); D.g.arc(D.X(c[0]), D.Y(c[1]), D.L(7), 0, Math.PI * 2); D.g.stroke(); D.g.restore();
  D.circle(c[0] + 7 * Math.cos(ang), c[1] + 7 * Math.sin(ang) * .62, 1.9, VP.tool, null);
  D.text('X', O[0] + ux[0] + 3, O[1] + 2, VP.ink, TYPE.label, 'left', 700);
  D.text('Y', O[0] + uy[0] + 3, O[1] + uy[1] - 2, VP.ink, TYPE.label, 'left', 700);
  D.text('Z', O[0] - 4.5, O[1] + uz[1], VP.ink, TYPE.label, 'left', 700);
  D.chip(p === 17 ? 'arc words  I  J' : p === 18 ? 'arc words  I  K' : 'arc words  J  K',
    50, 60.5, { col:VP.white, border:VP.edge });
  D.caption('arcs and cutter comp live in the active plane');
},

/* --- G20 / G21 : units --- */
units(D, t, o){
  const inch = o.u === 'in';
  D.title('G' + (inch ? '20 — INCH' : '21 — METRIC'));
  const x0 = 12, x1 = 88, y = 34;
  D.line(x0, y, x1, y, VP.white, .6);
  for (let i = 0; i <= 8; i++){
    const x = x0 + (x1 - x0) * i / 8;
    D.line(x, y, x, y - (i % 4 === 0 ? 7 : i % 2 === 0 ? 4.5 : 3), inch ? VP.feed : VP.ink2, .45);
  }
  for (let i = 0; i <= 20; i++){
    const x = x0 + (x1 - x0) * i / 20;
    D.line(x, y, x, y + (i % 10 === 0 ? 7 : i % 5 === 0 ? 4.5 : 3), inch ? VP.ink2 : VP.feed, .45);
  }
  D.text('1/8 inch divisions', x0, y - 12, inch ? VP.feed : VP.ink2, 3.1);
  D.text('millimetres', x0, y + 13, inch ? VP.ink2 : VP.feed, 3.1);
  const k = (Math.sin(t * Math.PI * 2) * .5 + .5);
  const px = x0 + (x1 - x0) * (.25 + .5 * k);
  D.line(px, y - 16, px, y + 16, VP.tool, .5, [2, 2]);
  const val = (.25 + .5 * k) * 2;
  D.rect(px - 15, 52, 30, 9, 'rgba(242,179,61,.14)', VP.tool, .4);
  D.text(inch ? val.toFixed(4) + '"' : (val * 25.4).toFixed(2) + ' mm', px, 56.5, VP.tool, 3.6, 'center', 600);
  D.caption(inch ? 'Z-.100 here is a light skim' : 'Z-.100 here is a tenth of a millimetre');
},

/* --- G30 / M06 : carousel --- */
carousel(D, t, o){
  const change = o.mode === 'change';
  D.title(change ? 'M06 — TOOL CHANGE' : 'G30 — TOOL CHANGE REFERENCE POINT');
  const cx = 68, cy = 36, R = 19;
  D.circle(cx, cy, R, null, VP.edge, .6, [3, 3]);
  const spin = change ? easeHold(t, .35, .7) : 0;
  for (let i = 0; i < 8; i++){
    const a = -Math.PI / 2 + (i + spin) * Math.PI / 4;
    const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
    const sel = i === 1;
    D.circle(px, py, 3.4, sel ? 'rgba(242,179,61,.85)' : 'rgba(255,255,255,.06)', sel ? VP.tool : VP.ink2, .45);
    D.text(String(i + 1), px, py, sel ? VP.bg : VP.ink2, 2.6, 'center', 700);
  }
  D.text('CAROUSEL', cx, cy, VP.ink2, TYPE.small, 'center', 600);
  const sx = 24;
  D.rect(sx - 6, 15, 12, 12, 'rgba(255,255,255,.05)', VP.ink2, .5);
  D.text('SPINDLE', sx, 12.3, VP.ink2, TYPE.small, 'center', 600);
  const held = change ? (t < .3 ? '1' : t > .75 ? '2' : '') : '1';
  if (held){
    D.poly([[sx - 3, 27], [sx + 3, 27], [sx + 2, 39], [sx - 2, 39]], VP.tool, .5, null, 'rgba(242,179,61,.7)', true);
    D.text('T' + held, sx, 21, VP.tool, TYPE.value, 'center', 700);
  }
  if (change && t >= .3 && t <= .75) D.chip('swapping', sx, 33, { col:VP.note, size:TYPE.small });
  D.line(sx + 8, 42, cx - R - 3, 42, VP.edge, .4, [2, 2]);
  D.caption(change ? 'follow every M06 with its own G43 H__' : 'the one place the carousel will run');
},

/* --- G40 / G41 / G42 : cutter compensation --- */
comp(D, t, o){
  const side = o.side;
  D.title('G' + (side === 'left' ? '41 — TOOL LEFT' : side === 'right' ? '42 — TOOL RIGHT' : '40 — COMP CANCELLED'));
  const path = [[22, 52], [22, 24], [52, 24], [68, 38], [68, 52]];
  D.poly([[22, 52], [22, 24], [52, 24], [68, 38], [68, 52], [22, 52]], VP.partLine, .6, null, 'rgba(30,42,50,.9)', true);

  const total = path.length - 1, tt = t * total;
  const i = Math.max(0, Math.min(total - 1, Math.floor(tt))), u = tt - i;
  const a = path[i], b = path[i + 1];
  const px = a[0] + (b[0] - a[0]) * u, py = a[1] + (b[1] - a[1]) * u;
  const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
  const off = side === 'off' ? 0 : (side === 'left' ? 1 : -1) * 5.5;
  /* v runs downward here, so the LEFT-hand normal of travel is (dy, -dx) */
  const nx = dy / m * off, ny = -dx / m * off;
  if (side !== 'off'){
    const ghost = path.map((p, j) => {
      const q = path[Math.min(path.length - 1, j + 1)], r = path[Math.max(0, j - 1)];
      const ddx = q[0] - r[0], ddy = q[1] - r[1], mm = Math.hypot(ddx, ddy) || 1;
      return [p[0] + ddy / mm * off, p[1] - ddx / mm * off];
    });
    D.poly(ghost, VP.feed, .6, [3, 2]);
  }
  D.circle(px + nx, py + ny, 5.5, 'rgba(242,179,61,.16)', VP.tool, .6);
  D.circle(px + nx, py + ny, .9, VP.tool, null);
  D.arrow(px, py, px + dx / m * 9, py + dy / m * 9, VP.white, .5, 2.4);
  D.key(side === 'off' ? [[VP.partLine, 'part line'], [VP.tool, 'cutter']]
                       : [[VP.partLine, 'part line'], [VP.feed, 'cutter centre'], [VP.tool, 'cutter']], 62.5);
  D.caption(side === 'off' ? 'no offset — the cutter centre rides the line and the part comes out one radius oversize'
    : 'face the direction of travel: the cutter sits to your ' + side);
},

/* --- G43 : tool length compensation --- */
tlo(D, t){
  D.title('G43 H01 — Z0 MEANS THE TOP OF THE PART');
  D.rect(10, 8, 80, 5, 'rgba(255,255,255,.05)', VP.ink2, .5);
  D.text('SPINDLE GAUGE LINE', 50, 10.5, VP.ink2, 2.7, 'center', 600);
  D.rect(12, 54, 76, 12, VP.part, VP.partLine, .6);
  D.text('Z0', 90, 54, VP.partLine, 3);
  D.line(12, 54, 92, 54, VP.partLine, .35, [2, 2]);
  const tools = [{ x: 32, len: 26, h: 'H01' }, { x: 66, len: 38, h: 'H02' }];
  const k = (Math.sin(t * Math.PI * 2 - Math.PI / 2) * .5 + .5);
  tools.forEach((tl, i) => {
    const active = (i === 0) === (k < .5);
    const tipY = active ? 54 - 2 - 10 * (1 - Math.abs(k * 2 - 1)) : 13 + tl.len;
    const topY = 13;
    D.rect(tl.x - 2.5, topY, 5, tl.len - 6, active ? 'rgba(242,179,61,.3)' : 'rgba(255,255,255,.05)', active ? VP.tool : VP.ink2, .5);
    D.poly([[tl.x - 2.5, topY + tl.len - 6], [tl.x + 2.5, topY + tl.len - 6], [tl.x, topY + tl.len]], active ? VP.tool : VP.ink2, .5, null, active ? 'rgba(242,179,61,.6)' : 'rgba(255,255,255,.05)', true);
    D.line(tl.x + 7, topY, tl.x + 7, topY + tl.len, active ? VP.note : VP.edge, .4, [2, 2]);
    D.text(tl.h + ' = ' + (tl.len / 8).toFixed(3) + '"', tl.x + 9, topY + tl.len / 2, active ? VP.note : VP.ink2, 2.9);
  });
  D.caption('different tools, different H — same Z0. at the part');
},

/* --- G54..G59 : work offsets --- */
wcs(D, t, o){
  D.title(o.ext ? 'G54 P1 – P48 — 48 MORE ORIGINS' : 'G54 – G59 — WHERE PART ZERO IS');
  D.rect(8, 12, 84, 50, 'rgba(255,255,255,.03)', VP.edge, .6);
  D.text('MACHINE TABLE', 50, 64, VP.ink2, TYPE.small, 'center', 600);
  const cols = o.ext ? 8 : 3, rows = o.ext ? 6 : 2, n = cols * rows;
  const lit = Math.floor(t * n) % n;
  for (let i = 0; i < n; i++){
    const cx = 8 + 84 * ((i % cols) + .5) / cols, cy = 12 + 50 * (Math.floor(i / cols) + .5) / rows;
    const w = o.ext ? 7 : 20, h = o.ext ? 5 : 16, on = i === lit;
    D.rect(cx - w / 2, cy - h / 2, w, h, on ? 'rgba(63,194,176,.16)' : 'rgba(111,139,153,.09)', on ? VP.feed : VP.edge, .5);
    const ox = cx - w / 2, oy = cy + h / 2;
    D.circle(ox, oy, o.ext ? 1.2 : 2, on ? VP.tool : VP.ink2, null);
    if (!o.ext) D.text('G5' + (4 + i), cx, cy, on ? VP.feed : VP.ink2, 3.2, 'center', 600);
    else if (on) D.text('P' + (i + 1), cx, cy - h, VP.feed, 2.7, 'center', 600);
  }
  D.caption(o.ext ? 'one subprogram, called under each offset in turn' : 'call one, and every coordinate is measured from its zero');
},

/* --- G74 / G84 : tapping --- */
tap(D, t, o){
  const right = o.dir === 'right';
  D.title('G' + (right ? '84 — RIGHT-HAND TAP' : '74 — LEFT-HAND TAP'));
  D.rect(16, 32, 68, 30, VP.part, VP.partLine, .6);
  const down = t < .5, k = down ? t / .5 : 1 - (t - .5) / .5;
  const zTop = 20, zBot = 52, z = zTop + (zBot - zTop) * k;
  D.rect(46, 32, 8, 26, VP.bg, null);
  for (let i = 0; i < 7; i++){
    const yy = 34 + i * 3.6;
    D.line(46, yy, 54, yy + 1.8, VP.partLine, .35);
  }
  D.rect(47.5, 12, 5, z - 12, 'rgba(242,179,61,.25)', VP.tool, .5);
  D.poly([[47.5, z], [52.5, z], [50, z + 3]], VP.tool, .5, null, 'rgba(242,179,61,.7)', true);
  const cw = right ? down : !down;
  D.arcArrow(50, 16, 7, cw ? -2.6 : .5, cw ? .5 : -2.6, down ? VP.feed : VP.rapid, .6, 2.6);
  D.text(cw ? 'M03' : 'M04', 62, 16, down ? VP.feed : VP.rapid, 3.2);
  D.arrow(38, z - 6, 38, z + (down ? 6 : -14), down ? VP.feed : VP.rapid, .5, 2.4);
  D.chip('feed = pitch × rpm', 50, 63, { col:VP.note });
  D.caption(down ? 'feeding in, one pitch per revolution' : 'spindle reversed, feeding back out');
},

/* --- G80 : canned cycle cancel --- */
cancel(D, t){
  D.title('G80 — UNTIL YOU WRITE IT, EVERY X/Y IS ANOTHER HOLE');
  const src = ['G81 Z-.4 R.1 F6.', 'X1.0', 'X2.0', 'G80', 'G01 X3.0 Y1.0'];
  const p = Math.floor(t * 5) % 5;
  src.forEach((s, i) => {
    const on = i === p;
    if (on) D.rect(6, 12 + i * 8 - 3.6, 44, 7.2, 'rgba(242,179,61,.16)', null);
    D.text(s, 9, 12 + i * 8, on ? VP.tool : i === 3 ? VP.feed : VP.ink2, 3.2);
  });
  D.rect(56, 34, 38, 14, VP.part, VP.partLine, .6);
  const holes = [62, 71, 80];
  holes.forEach((hx, i) => {
    const drilled = p > i;
    D.circle(hx, 34, 2.2, drilled ? VP.bg : 'rgba(255,255,255,.04)', drilled ? VP.partLine : VP.edge, .5);
    if (drilled) D.line(hx, 34, hx, 44, VP.bg, 2.4);
  });
  if (p === 4){
    D.line(56, 30, 94, 30, VP.feed, .8);
    D.text('contour — no holes', 75, 25, VP.feed, 3, 'center');
  } else if (p === 3){
    D.text('cycle off', 75, 25, VP.feed, 3, 'center');
  }
  D.caption(p < 3 ? 'block ' + (p + 1) + ': another hole' : 'cancelled — now X and Y just move');
},

/* --- G90 / G91 : absolute or incremental --- */
absinc(D, t, o){
  const abs = o.mode === 'abs';
  D.title('G' + (abs ? '90 — FROM PART ZERO' : '91 — FROM WHERE YOU ARE'));
  const ox = 26, oy = 54, u = 13;
  for (let i = 0; i <= 4; i++){
    D.line(ox + i * u, oy, ox + i * u, oy - 4 * u, VP.grid, .35);
    D.line(ox, oy - i * u, ox + 4 * u, oy - i * u, VP.grid, .35);
  }
  D.line(ox, oy, ox + 4 * u, oy, VP.edge, .5);
  D.line(ox, oy, ox, oy - 4 * u, VP.edge, .5);
  D.circle(ox, oy, 2, VP.ink2, null);
  D.text('X0 Y0', ox - 2, oy + 5, VP.ink2, 2.9, 'right');
  const pts = abs ? [[0, 0], [1, 1], [2, 2], [3, 3]] : [[0, 0], [1, 1], [2, 2], [3, 3]];
  const words = abs ? ['X1.0 Y1.0', 'X2.0 Y2.0', 'X3.0 Y3.0'] : ['X1.0 Y1.0', 'X1.0 Y1.0', 'X1.0 Y1.0'];
  const step = Math.max(0, Math.min(2, Math.floor(t * 3)));
  for (let i = 1; i <= step + 1 && i < pts.length; i++){
    const a = pts[i - 1], b = pts[i];
    const done = i <= step;
    D.line(ox + a[0] * u, oy - a[1] * u, ox + b[0] * u, oy - b[1] * u, done ? VP.feed : VP.edge, .7, done ? null : [2, 2]);
  }
  pts.forEach((p, i) => { if (i <= step + 1) D.circle(ox + p[0] * u, oy - p[1] * u, 1.8, i <= step + 1 ? VP.feed : VP.edge, null); });
  const cp = pts[Math.max(0, Math.min(step + 1, 3))];
  D.circle(ox + cp[0] * u, oy - cp[1] * u, 4, 'rgba(242,179,61,.18)', VP.tool, .6);
  words.forEach((w, i) => D.text(w, 80, 22 + i * 7, i === step ? VP.tool : VP.ink2, 3.2, 'center'));
  D.caption(abs ? 'each block names a point on the part' : 'each block names a distance from the last one');
},

/* --- G94 / G95 : feed mode --- */
feedmode(D, t, o){
  const ipm = o.m === 'ipm';
  D.title('G' + (ipm ? '94 — INCHES PER MINUTE' : '95 — INCHES PER REVOLUTION'));
  const rows = [{ rpm: 500, y: 24 }, { rpm: 2000, y: 46 }];
  rows.forEach(r => {
    D.text(r.rpm + ' rpm', 6, r.y, VP.ink, TYPE.value, 'left', 600);
    D.arcArrow(30, r.y, 5.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ((t * r.rpm / 500) % 1) - .01, VP.ink2, .5, 2.2);
    const chip = ipm ? (r.rpm === 500 ? 4 : 1) : 2.5;
    const bar = ipm ? 26 : 26;
    D.rect(40, r.y - 3, bar, 6, 'rgba(255,255,255,.04)', VP.edge, .4);
    const nChips = Math.round(bar / chip);
    for (let i = 0; i < nChips; i++) D.line(40 + i * chip + 1, r.y - 2, 40 + i * chip + 1, r.y + 2, VP.feed, .45);
    D.text(ipm ? 'F12.' : 'F0.006', 69, r.y, VP.feed, TYPE.value, 'left', 600);
    /* the verdict goes under its own bar, not alongside the feed word */
    D.chip(ipm ? (r.rpm === 500 ? 'heavy chip' : 'thin chip') : 'same chip', 53, r.y + 7.5,
      { col: ipm ? (r.rpm === 500 ? VP.rapid : VP.note) : VP.feed, size:TYPE.small });
  });
  D.line(6, 35, 94, 35, VP.grid2, .35);
  D.caption(ipm ? 'change the speed and the chip load changes with it' : 'chip load holds when the spindle speed moves');
},

/* --- M00 / M01 / M30 / M98 / M99 : program flow --- */
program(D, t, o){
  const k = o.kind;
  const two = (k === 'm98' || k === 'm99');
  const main = two
    ? ['O0001', 'G54 G00 X0 Y0', 'M98 P1001', 'G55 G00 X0 Y0', 'M98 P1001', 'M30']
    : k === 'm30' ? ['O0001', 'S2400 M03', 'G01 X2. F12.', 'G28 Z0.', 'M30']
    : ['G01 X2. F12.', 'G00 Z1.0', k === 'm01' ? 'M01' : 'M00', 'T02 M06', 'G43 H02 Z1.0'];
  const sub = ['O1001', 'G81 Z-.4 R.1', 'X1.0', 'G80', 'M99'];
  D.title(k === 'm00' ? 'M00 — ALWAYS STOPS' : k === 'm01' ? 'M01 — STOPS ONLY IF THE LAMP IS ON'
    : k === 'm30' ? 'M30 — END AND REWIND' : k === 'm98' ? 'M98 — CALL THE SUBPROGRAM' : 'M99 — AND COME BACK');
  const lamp = k === 'm01' ? (t < .5) : false;

  let ptr;
  if (two){
    const seq = [0, 1, 2, 'S0', 'S1', 'S2', 'S3', 'S4', 3, 4, 'S0', 'S1', 'S4', 5];
    ptr = seq[Math.floor(t * seq.length) % seq.length];
  } else {
    const n = main.length;
    const raw = Math.floor(t * (n + 2));
    const stopAt = k === 'm30' ? n - 1 : 2;
    ptr = (!lamp && raw > stopAt && k !== 'm30') ? Math.min(n - 1, raw - 1) : Math.min(stopAt, raw);
    if (k === 'm01' && lamp) ptr = Math.min(n - 1, raw);
    if (k === 'm30') ptr = Math.min(n - 1, raw) === n - 1 && raw > n - 1 ? 0 : Math.min(n - 1, raw);
  }
  const drawList = (lines, x, y0, w, active) => {
    D.rect(x - 2, y0 - 5, w, lines.length * 7.4 + 4, 'rgba(255,255,255,.025)', VP.edge, .5);
    lines.forEach((s, i) => {
      const on = active === i;
      if (on) D.rect(x - 2, y0 + i * 7.4 - 3.4, w, 6.8, 'rgba(242,179,61,.17)', null);
      D.text(s, x + 1, y0 + i * 7.4, on ? VP.tool : (/M0[01]|M30|M9[89]/.test(s) ? VP.feed : VP.ink2), 3.2);
    });
  };
  if (two){
    const sp = typeof ptr === 'string' ? parseInt(ptr.slice(1), 10) : null;
    drawList(main, 8, 16, 40, sp === null ? ptr : null);
    drawList(sub, 58, 16, 36, sp);
    D.arrow(48, 16 + 2 * 7.4, 56, 16, k === 'm98' ? VP.tool : VP.edge, .55, 2.6);
    D.arrow(56, 16 + 4 * 7.4, 48, 16 + 3 * 7.4, k === 'm99' ? VP.tool : VP.edge, .55, 2.6);
    D.text('M98', 52, 12, k === 'm98' ? VP.tool : VP.ink2, 2.8, 'center', 600);
    D.text('M99', 52, 50, k === 'm99' ? VP.tool : VP.ink2, 2.8, 'center', 600);
    D.caption('one piece of geometry, run wherever you like');
  } else {
    drawList(main, 20, 16, 46, ptr);
    if (k === 'm01'){
      D.circle(78, 22, 4, lamp ? 'rgba(63,194,176,.8)' : 'rgba(255,255,255,.05)', lamp ? VP.feed : VP.ink2, .6);
      D.text('OPT', 78, 30, lamp ? VP.feed : VP.ink2, 2.8, 'center', 600);
      D.text('STOP', 78, 34, lamp ? VP.feed : VP.ink2, 2.8, 'center', 600);
    }
    if (k === 'm30' && ptr === 0 && t > .7) D.arcArrow(14, 30, 8, 1.2, 4.8, VP.feed, .6, 2.6);
    const stopped = (k === 'm00' && ptr === 2) || (k === 'm01' && lamp && ptr === 2);
    D.caption(stopped ? 'held — spindle and coolant off, cycle start to carry on'
      : k === 'm01' ? (lamp ? 'lamp on: the stop happens' : 'lamp off: straight past it')
      : k === 'm30' ? 'rewound and ready for the next part'
      : 'the block pointer works down the program');
  }
},

/* --- M03 / M04 / M05 / M13-M15 / M19 / M20 : spindle --- */
spindle(D, t, o){
  const dir = o.dir;
  D.title(dir > 0 ? 'M03 — SPINDLE FORWARD'
    : dir < 0 ? 'M04 — SPINDLE REVERSE' : o.orient ? 'M19 — HELD ON ORIENT' : o.orient === false ? 'M20 — FREE TO TURN' : 'M05 — SPINDLE STOPPED');
  const cx = 40, cy = 36, R = 17;
  const sp = dir === 0 ? 0 : t * Math.PI * 2 * dir * 2;
  D.circle(cx, cy, R + 5, 'rgba(255,255,255,.03)', VP.edge, .5);
  D.circle(cx, cy, R, null, VP.ink2, .6);
  for (let i = 0; i < 3; i++){
    const a = sp + i * Math.PI * 2 / 3;
    D.poly([[cx, cy], [cx + R * Math.cos(a), cy + R * Math.sin(a) * .96],
            [cx + R * Math.cos(a + .5), cy + R * Math.sin(a + .5) * .96]],
      dir === 0 ? VP.ink2 : VP.tool, .5, null, dir === 0 ? 'rgba(255,255,255,.06)' : 'rgba(242,179,61,.35)', true);
  }
  D.circle(cx, cy, 3.4, VP.bg, VP.ink2, .5);
  if (dir !== 0){
    const a0 = -1.2, a1 = a0 + dir * 2.6;
    D.arcArrow(cx, cy, R + 9, dir > 0 ? a0 : a1, dir > 0 ? a1 : a0, VP.feed, .7, 3);
  }
  if (o.orient){
    const a = -Math.PI / 2;
    D.line(cx, cy, cx + (R + 4) * Math.cos(a), cy + (R + 4) * Math.sin(a), VP.note, .8);
    D.circle(cx + (R + 4) * Math.cos(a), cy + (R + 4) * Math.sin(a), 2.2, VP.note, null);
  }
  /* one status chip under the dial, clear of the heading band */
  D.chip(dir > 0 ? 'CW looking down' : dir < 0 ? 'CCW looking down'
       : o.orient ? 'held on the key' : o.orient === false ? 'free to turn' : 'stopped — 0 rpm',
    cx, cy + R + 9, { col: dir !== 0 ? VP.feed : o.orient ? VP.note : VP.ink2 });
  if (o.coolant !== undefined){
    const on = !!o.coolant;
    D.rect(70, 14, 22, 40, 'rgba(255,255,255,.03)', VP.edge, .5);
    D.text('COOLANT', 81, 19, VP.ink2, 2.8, 'center', 600);
    D.circle(81, 28, 4, on ? 'rgba(63,194,176,.75)' : 'rgba(255,255,255,.05)', on ? VP.feed : VP.ink2, .6);
    D.text(on ? 'ON' : 'OFF', 81, 38, on ? VP.feed : VP.ink2, 3.4, 'center', 700);
    if (on) for (let i = 0; i < 4; i++){
      const yy = 42 + ((t * 20 + i * 3) % 10);
      D.line(81 - 3 + i * 2, yy, 81 - 3 + i * 2, yy + 2, VP.feed, .45);
    }
    D.chip('one word, both jobs', 81, 60, { col:VP.note, size:TYPE.small });
  }
  D.caption(o.coolant !== undefined ? 'only one M code per block — this is why the combined codes exist'
    : dir === 0 && o.orient === undefined ? 'get the tool clear before you stop the spindle'
    : o.orient !== undefined ? 'the spindle is parked on its key, not just stopped'
    : 'the M word picks the direction, the S word sets the speed: S2400 M0' + (dir > 0 ? '3' : '4'));
},

/* --- M08 / M09 / M51-M54 : coolant --- */
coolant(D, t, o){
  const kind = o.kind, on = o.on;
  const names = { flood: ['M08 — FLOOD COOLANT', 'M09 — COOLANT OFF'],
                  flush: ['M51 — CHIP FLUSH ON', 'M52 — CHIP FLUSH OFF'],
                  thru:  ['M53 — THRU-SPINDLE ON', 'M54 — THRU-SPINDLE OFF'] };
  D.title(names[kind][on ? 0 : 1]);
  D.rect(14, 48, 72, 14, VP.part, VP.partLine, .6);
  const deep = kind === 'thru';
  const holeD = deep ? 13 : 5;
  D.rect(47, 48, 6, holeD, VP.bg, null);
  D.rect(47.4, 16, 5.2, 32 + holeD - 1, 'rgba(242,179,61,.25)', VP.tool, .5);
  if (deep){
    D.line(50, 16, 50, 48 + holeD - 2, on ? VP.feed : VP.edge, 1.1, on ? null : [2, 2]);
    if (on) for (let i = 0; i < 5; i++){
      const yy = 50 + holeD + ((t * 26 + i * 5) % 12);
      D.line(44 - i, yy, 42 - i, yy + 3, VP.feed, .5);
      D.line(56 + i, yy, 58 + i, yy + 3, VP.feed, .5);
    }
    D.chip(on ? 'coolant reaches the point' : 'flood never gets down here', 50, 63.5,
      { col: on ? VP.feed : VP.rapid });
  } else {
    const nz = kind === 'flush' ? [[16, 40], [84, 40]] : [[36, 26], [64, 26]];
    nz.forEach(n2 => {
      D.poly([[n2[0] - 2.5, n2[1] - 4], [n2[0] + 2.5, n2[1] - 4], [n2[0] + 1.5, n2[1]], [n2[0] - 1.5, n2[1]]], VP.ink2, .5, null, 'rgba(255,255,255,.08)', true);
      if (on){
        const toX = kind === 'flush' ? 50 : 50, toY = kind === 'flush' ? 48 : 48;
        for (let i = 0; i < 5; i++){
          const u = ((t * 1.6 + i / 5) % 1);
          const px = n2[0] + (toX - n2[0]) * u, py = n2[1] + (toY - n2[1]) * u + 4 * u * u;
          D.circle(px, py, .9, VP.feed, null);
        }
      }
    });
    if (kind === 'flush' && on) for (let i = 0; i < 6; i++){
      const u = ((t * 1.2 + i / 6) % 1);
      D.line(20 + u * 60, 46 - Math.sin(u * 3.1) * 3, 22 + u * 60, 47 - Math.sin(u * 3.1) * 3, VP.note, .5);
    }
    D.chip(on ? 'flowing' : 'dry', 50, 63.5, { col: on ? VP.feed : VP.ink2, weight:700 });
  }
  D.caption(kind === 'flush' ? 'housekeeping, not cutting' : kind === 'thru' ? 'the tool needs a hole through it' : 'in cast iron, dry is often the right answer');
},

/* --- M10 / M11 : rotary table clamp --- */
rotary(D, t, o){
  const cl = o.clamped;
  D.title(cl ? 'M10 — ROTARY TABLE CLAMPED' : 'M11 — UNCLAMPED, FREE TO INDEX');
  const cx = 50, cy = 38, R = 20;
  const ang = cl ? 0 : t * Math.PI * 2 * .5;
  D.circle(cx, cy, R, 'rgba(255,255,255,.04)', VP.ink2, .7);
  for (let i = 0; i < 12; i++){
    const a = ang + i * Math.PI / 6;
    D.line(cx + (R - 3) * Math.cos(a), cy + (R - 3) * Math.sin(a), cx + R * Math.cos(a), cy + R * Math.sin(a), VP.edge, .5);
  }
  D.line(cx, cy, cx + (R - 5) * Math.cos(ang), cy + (R - 5) * Math.sin(ang), VP.partLine, .8);
  D.circle(cx, cy, 2.4, VP.partLine, null);
  D.chip('A axis', cx, cy + R + 6, { col:VP.ink2, size:TYPE.small });
  [[-1, 0], [1, 0]].forEach(d => {
    const gap = cl ? 0 : 4;
    const jx = cx + d[0] * (R + 5 + gap);
    D.rect(jx - 3.5, cy - 5, 7, 10, cl ? 'rgba(232,86,74,.3)' : 'rgba(255,255,255,.05)', cl ? VP.rapid : VP.ink2, .6);
    if (cl) D.arrow(jx + d[0] * 8, cy, jx + d[0] * 4.5, cy, VP.rapid, .5, 2.4);
  });
  if (!cl) D.arcArrow(cx, cy, R + 10, -1.4, 1.4, VP.feed, .6, 3);
  D.caption(cl ? 'clamp before you cut — the cutter will push it otherwise' : 'unclamp before you index, every time');
},

/* --- M21 / M22 / M23 : mirror image --- */
mirror(D, t, o){
  const ax = o.ax;
  D.title(ax === 'x' ? 'M21 — X MIRRORED' : ax === 'y' ? 'M22 — Y MIRRORED' : 'M23 — MIRROR OFF');
  const cx = 50, cy = 38;
  D.line(cx, 10, cx, 66, ax === 'x' ? VP.note : VP.grid2, ax === 'x' ? .6 : .35, [3, 3]);
  D.line(12, cy, 88, cy, ax === 'y' ? VP.note : VP.grid2, ax === 'y' ? .6 : .35, [3, 3]);
  const shape = [[4, -2], [26, -2], [26, 8], [18, 8], [18, 18], [4, 18]];
  const draw = (mx, my, col, w, dash, fill) => {
    D.poly(shape.map(p => [cx + p[0] * mx, cy + p[1] * my]), col, w, dash, fill, true);
  };
  draw(1, 1, VP.feed, .7, null, 'rgba(63,194,176,.13)');
  D.text('as written', cx + 15, cy + 22, VP.feed, 2.9, 'center');
  if (ax === 'x'){ draw(-1, 1, VP.tool, .7, [3, 2], 'rgba(242,179,61,.12)'); D.text('as cut', cx - 15, cy + 22, VP.tool, 2.9, 'center'); }
  if (ax === 'y'){ draw(1, -1, VP.tool, .7, [3, 2], 'rgba(242,179,61,.12)'); D.text('as cut', cx + 15, cy - 22, VP.tool, 2.9, 'center'); }
  const k = t;
  const px = cx + (ax === 'x' ? -1 : 1) * (4 + 22 * k), py = cy + (ax === 'y' ? -1 : 1) * (-2 + 20 * (k > .5 ? (k - .5) * 2 : 0));
  if (ax !== 'off') D.circle(px, py, 2.4, 'rgba(242,179,61,.2)', VP.tool, .6);
  D.circle(cx, cy, 1.8, VP.ink2, null);
  D.caption(ax === 'off' ? 'signs are back the way they were written' : 'climb becomes conventional, and G41 swaps sides with G42');
},

/* --- M29 : rigid tapping --- */
rigidtap(D, t){
  D.title('M29 — SPINDLE AND Z LOCKED TOGETHER');
  const cx = 30, cy = 30, R = 13;
  const rot = t * Math.PI * 2 * 2;
  D.circle(cx, cy, R, 'rgba(255,255,255,.04)', VP.ink2, .6);
  for (let i = 0; i < 8; i++){
    const a = rot + i * Math.PI / 4;
    D.line(cx + (R - 4) * Math.cos(a), cy + (R - 4) * Math.sin(a), cx + R * Math.cos(a), cy + R * Math.sin(a), VP.tool, .6);
  }
  D.chip('SPINDLE', cx, cy + R + 9, { col:VP.ink2, size:TYPE.small });
  D.arcArrow(cx, cy, R + 5, -1.2, 1.4, VP.feed, .55, 2.6);
  const zTop = 16, zBot = 56, k = t < .5 ? t * 2 : 2 - t * 2;
  const z = zTop + (zBot - zTop) * k;
  D.line(72, zTop, 72, zBot, VP.edge, .5);
  D.poly([[69, z], [75, z], [75, z + 4], [69, z + 4]], VP.tool, .5, null, 'rgba(242,179,61,.5)', true);
  D.text('Z', 72, zTop - 5, VP.ink2, 3, 'center', 600);
  D.arrow(72 + 8, z + 2, 72 + 8, z + 2 + (t < .5 ? 7 : -7), VP.feed, .5, 2.2);
  const lx = (cx + R + 12 + 64) / 2;
  D.line(cx + R + 12, 30, lx - 7, 30, VP.feed, .6, [2, 2]);
  D.line(lx + 7, 30, 64, 30, VP.feed, .6, [2, 2]);
  D.circle(lx, 30, 6.4, 'rgba(63,194,176,.18)', VP.feed, .6);
  D.text('LOCK', lx, 30, VP.feed, TYPE.small, 'center', 700);
  D.caption('the tap is driven, not floating — write M29 in the block before G84');
},

/* --- M68 / M69 : chip conveyor --- */
conveyor(D, t, o){
  const on = o.on;
  D.title(on ? 'M68 — CHIP CONVEYOR RUNNING' : 'M69 — CONVEYOR STOPPED');
  D.poly([[10, 56], [58, 56], [88, 26], [88, 20], [56, 50], [10, 50]], VP.ink2, .6, null, 'rgba(255,255,255,.04)', true);
  const k = on ? (t % 1) : 0;
  for (let i = 0; i < 7; i++){
    const u = (i / 7 + k) % 1;
    let px, py;
    if (u < .62){ px = 10 + (58 - 10) * (u / .62); py = 53; }
    else { const v = (u - .62) / .38; px = 58 + (88 - 58) * v; py = 53 - 30 * v; }
    D.poly([[px - 1.6, py - 1], [px + 1.2, py - 2.2], [px + 1.8, py], [px - .6, py + 1.4]], VP.note, .4, null, 'rgba(201,176,120,.6)', true);
  }
  for (let i = 0; i < 5; i++){
    const bx = 16 + i * 9;
    D.line(bx, 50, bx + 3, 56, on ? VP.edge : VP.grid2, .4);
  }
  D.rect(84, 40, 14, 22, 'rgba(255,255,255,.04)', VP.ink2, .5);
  D.text('BIN', 91, 52, VP.ink2, 2.9, 'center', 600);
  D.circle(16, 22, 3.4, on ? 'rgba(63,194,176,.8)' : 'rgba(255,255,255,.05)', on ? VP.feed : VP.ink2, .6);
  D.text(on ? 'RUNNING' : 'STOPPED', 23, 22, on ? VP.feed : VP.ink2, 3.2, 'left', 600);
  D.caption(on ? 'chips banked against a fixture will lift a part' : 'stop it before anybody reaches in');
}
};

/* ------------------------- 5 · DEMO PLAYER ------------------------- */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SC_CYCLE = 3.6;

function mountDemo(pane, demo){
  pane.innerHTML = '';
  const views = demo.k === 'gc' ? (demo.view === 'both' ? ['xy', 'xz'] : [demo.view]) : ['sc'];
  const holder = document.createElement('div');
  holder.className = views.length > 1 ? 'vp-stack' : '';
  if (views.length === 1) holder.style.display = 'block';
  pane.appendChild(holder);
  const pads = views.map(v => {
    const box = document.createElement('div'); box.className = 'vp';
    const cv = document.createElement('canvas'); box.appendChild(cv);
    if (v !== 'sc'){
      const tag = document.createElement('div'); tag.className = 'vp-tag';
      tag.textContent = v === 'xy' ? 'Top — XY' : 'Front — XZ';
      box.appendChild(tag);
    }
    holder.appendChild(box);
    return { pad: new Pad(cv), v };
  });

  const foot = document.createElement('div');
  foot.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
  if (demo.k === 'gc'){
    const lg = document.createElement('div'); lg.className = 'legend';
    lg.innerHTML = '<span class="r"><i></i>rapid</span><span class="f"><i></i>feed</span>';
    foot.appendChild(lg);
  }
  const sp = document.createElement('span'); sp.className = 'spacer'; foot.appendChild(sp);
  const rp = document.createElement('button');
  rp.className = 'ghost-btn'; rp.type = 'button'; rp.textContent = 'Replay';
  foot.appendChild(rp);
  pane.appendChild(foot);

  const run = demo.k === 'gc' ? runProgram(demo.src) : null;
  const cycle = demo.k === 'gc' ? run.total + 1.1 : SC_CYCLE;
  let raf = 0, t0 = performance.now(), once = REDUCED;

  function paint(tt){
    pads.forEach(p => {
      if (demo.k === 'gc'){
        renderRun(p.pad, run, p.v, tt, demo.stock, { notes: true });
      } else {
        if (!p.pad.fitPixels()) return;
        p.pad.clear();
        const D = design(p.pad);
        const fn = SCHEM[demo.n];
        if (fn) fn(D, Math.max(0, Math.min(0.999, tt / SC_CYCLE)), demo.o || {});
      }
    });
  }
  function frame(now){
    const el = Math.max(0, (now - t0) / 1000);
    if (once){ paint(demo.k === 'gc' ? run.total : SC_CYCLE * 0.62); raf = 0; return; }
    paint(el % cycle);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  rp.addEventListener('click', () => { t0 = performance.now(); once = false; if (!raf) raf = requestAnimationFrame(frame); });
  const ro = new ResizeObserver(() => { if (!raf) paint(demo.k === 'gc' ? run.total : SC_CYCLE * 0.62); });
  ro.observe(pane);
  return { stop(){ if (raf) cancelAnimationFrame(raf); raf = 0; ro.disconnect(); }, replay(){ rp.click(); } };
}
