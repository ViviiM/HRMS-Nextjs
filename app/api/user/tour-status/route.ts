import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // If no session, unauthorized
  if (!session || !session.user || !session.user.employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employeeId = session.user.employeeId;
  const pk = `USER_PREF#${employeeId}`;
  const sk = "TOUR_STATUS";

  try {
    //  const res = await docClient.send(new GetCommand({
    //      TableName: TABLE_NAME,
    //      Key: { PK: pk, SK: sk }
    //  }));

    //  if (res.Item) {
    //      return NextResponse.json({ hasSeenTour: res.Item.hasSeenTour });
    //  }
     
     // Default is false (tour not recently seen)
     // BUT, we only want to show it on "First Login". 
     // If no record exists, it might be the first time?
     // Or we can assume if no record, show it.
     return NextResponse.json({ hasSeenTour: false });

  } catch (error) {
    console.warn("Error fetching tour status (DynamoDB might be offline or unconfigured):", error);
    // If DB fails, we might default to true (don't annoy user) or false.
    // Let's default to false to be safe but console log it.
    return NextResponse.json({ hasSeenTour: false });
  }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // const { hasSeenTour } = await request.json();
        // const employeeId = session.user.employeeId;
        // const pk = `USER_PREF#${employeeId}`;
        // const sk = "TOUR_STATUS";

        // await docClient.send(new PutCommand({
        //     TableName: TABLE_NAME,
        //     Item: {
        //         PK: pk,
        //         SK: sk,
        //         hasSeenTour: hasSeenTour,
        //         updatedAt: new Date().toISOString()
        //     }
        // }));
        return NextResponse.json({ success: true });
    } catch (e) {
         console.error("Error updating tour status:", e);
         return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}
